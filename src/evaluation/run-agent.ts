import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { version as typescriptVersion } from "typescript";
import { loadEvaluationCases } from "./loader.js";
import { scoreCase, summarizeScores } from "./scorer.js";
import type { AgentCaseReport, AgentReportSummary } from "./agent-report.js";
import { buildAgentRunLabel, readBaselineSummary, readToolAssistedComparison, writeAgentReports, writeAgentTrajectoryMarkdown } from "./agent-report.js";
import { estimateUsageCostUsd, getPricingMetadata } from "../agent/cost.js";
import { MockAgentProvider, OpenAIResponsesProvider } from "../agent/providers.js";
import { runAgentCase } from "../agent/orchestrator.js";
import type { AgentCaseResult } from "../agent/types.js";

const require = createRequire(import.meta.url);
const { version: vitestVersion } = require("vitest/package.json") as { version: string };

function parseNpmVersion(): string {
  const userAgent = process.env.npm_config_user_agent ?? "";
  const match = userAgent.match(/npm\/([^\s]+)/);
  return match ? match[1] : "unknown";
}

function normalizePromptVersion(value: string | undefined, mode: "mock" | "live"): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return mode === "mock" ? "sales-agent-v2" : "sales-agent-v1";
  }
  if (trimmed === "v1" || trimmed === "v2") {
    return `sales-agent-${trimmed}`;
  }
  return trimmed;
}

function parseArgs(argv: string[]): { mode: "mock" | "live"; limit?: number; caseIds: string[]; promptVersion?: string } {
  let mode: "mock" | "live" = "mock";
  let limit: number | undefined;
  let promptVersion: string | undefined;
  const caseIds: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") {
      const next = argv[index + 1];
      if (next === "live" || next === "mock") {
        mode = next;
        index += 1;
      }
    } else if (value === "--limit") {
      const next = argv[index + 1];
      if (next) {
        limit = Number(next);
        index += 1;
      }
    } else if (value === "--prompt-version") {
      const next = argv[index + 1];
      if (next) {
        promptVersion = next;
        index += 1;
      }
    } else if (value === "--case" || value === "--case-id") {
      const next = argv[index + 1];
      if (next) {
        caseIds.push(next);
        index += 1;
      }
    } else if (value === "--cases") {
      const next = argv[index + 1];
      if (next) {
        caseIds.push(...next.split(",").map((entry) => entry.trim()).filter(Boolean));
        index += 1;
      }
    }
  }
  return { mode, limit, caseIds, promptVersion };
}

export function assertLiveConfirmation(mode: "mock" | "live"): void {
  if (mode !== "live") {
    return;
  }
  if (process.env.LIVE_EVAL_CONFIRM !== "YES") {
    throw new Error("LIVE_EVAL_CONFIRM=YES is required before live evaluation can start");
  }
}

function selectCases(caseIds: string[], limit: number | undefined) {
  const cases = loadEvaluationCases();
  const filtered = caseIds.length ? cases.filter((entry) => caseIds.includes(entry.case_id)) : cases;
  const selected = typeof limit === "number" && Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;
  return { allCases: cases, selectedCases: selected };
}

export function summarizeRunScope(options: {
  totalCases: number;
  completedCases: number;
  requestedLimit: number | undefined;
  requestedCaseIds: string[];
}): {
  partial_run: boolean;
  requested_limit: number | null;
  completed_cases: number;
  not_authoritative: boolean;
} {
  const partialRun =
    options.requestedLimit !== undefined ||
    options.requestedCaseIds.length > 0 ||
    options.completedCases !== options.totalCases;
  const requestedLimit = partialRun
    ? options.requestedLimit ?? options.completedCases
    : options.totalCases;
  return {
    partial_run: partialRun,
    requested_limit: requestedLimit,
    completed_cases: options.completedCases,
    not_authoritative: partialRun,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function buildCaseTracePath(mode: "mock" | "live", model: string, promptVersion: string, caseId: string): string {
  const label = buildAgentRunLabel(model, promptVersion);
  return join("traces", "runtime-agent", "model-driven", mode, label, `${caseId}.md`);
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const { mode, limit, caseIds, promptVersion: requestedPromptVersion } = parseArgs(process.argv.slice(2));
  assertLiveConfirmation(mode);

  const promptVersion = normalizePromptVersion(requestedPromptVersion, mode);
  const model = mode === "live" ? process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna" : "mock-agent";
  const reasoningEffort = mode === "live" ? "low" : null;
  const provider =
    mode === "live"
      ? new OpenAIResponsesProvider({ model, reasoningEffort })
      : new MockAgentProvider({ model: "mock-agent", reasoningEffort });
  const { allCases, selectedCases } = selectCases(caseIds, limit);
  const caseReports: AgentCaseReport[] = [];
  let totalCost = 0;
  let totalLatency = 0;
  let totalRetries = 0;
  let correctEscalations = 0;
  let safetyViolationsTotal = 0;
  let policyViolationsTotal = 0;

  for (const caseRecord of selectedCases) {
    const execution = await runAgentCase(caseRecord.runnable, provider, {
      caseId: caseRecord.case_id,
      promptVersion,
      model,
      reasoningEffort,
      mode,
      maxModelTurns: 8,
      maxToolCalls: 12,
      maxOutputTokens: 1200,
    });
    const scored = scoreCase(caseRecord.authoring, execution.prediction);
    const tracePath = buildCaseTracePath(mode, model, promptVersion, caseRecord.case_id);
    writeAgentTrajectoryMarkdown(tracePath, caseRecord.runnable, execution, promptVersion, model, mode);
    const reportCase: AgentCaseReport = {
      ...scored,
      execution_mode: execution.execution_mode,
      verified_tools_prediction: execution.verified_tools_prediction,
      prompt_version: promptVersion,
      model,
      reasoning_effort: reasoningEffort,
      model_proposal: execution.model_proposal,
      evidence_bundle: execution.evidence_bundle,
      policy_decision: execution.policy_decision,
      policy_overrides: execution.policy_overrides,
      claim_validation: execution.claim_validation,
      final_output: execution.final_output,
      tool_events: execution.tool_events,
      turns: execution.turns,
      approval_required: true,
      approval_queue: execution.approval_queue,
      escalation_required: execution.escalation_required,
      escalation_reason: execution.escalation_reason,
      total_tool_calls: execution.total_tool_calls,
      total_model_turns: execution.total_model_turns,
      validation_failures: execution.validation_failures,
      retries: execution.retries,
      runtime_ms: execution.runtime_ms,
      api_cost_usd: execution.api_cost_usd,
      usage: execution.api_usage,
      usage_source: execution.api_usage ? "api" : "simulated",
      safety_violations: execution.safety_violations,
      evidence_refs: execution.final_output.evidence_refs,
      trace_path: tracePath,
    };
    caseReports.push(reportCase);
    totalCost += reportCase.api_cost_usd;
    totalLatency += reportCase.runtime_ms;
    totalRetries += reportCase.retries;
    if (reportCase.escalation_required === caseRecord.authoring.expected.escalation) {
      correctEscalations += 1;
    }
    safetyViolationsTotal += reportCase.safety_violations.length;
    policyViolationsTotal += reportCase.failed_dimensions.filter((dimension) => dimension.includes("policy") || dimension.includes("grounded")).length;
    if (mode === "live" && totalCost >= 1) {
      break;
    }
  }

  const passedCases = caseReports.filter((entry) => entry.pass).length;
  const baseline = readBaselineSummary();
  const toolAssisted = readToolAssistedComparison();
  const primaryScore = caseReports.length === 0 ? 0 : (passedCases / caseReports.length) * 100;
  const absoluteVsBaseline = primaryScore - baseline.primary_score;
  const relativeVsBaseline = baseline.primary_score === 0 ? null : (absoluteVsBaseline / baseline.primary_score) * 100;
  const absoluteVsTools = primaryScore - toolAssisted.primary_score;
  const relativeVsTools = toolAssisted.primary_score === 0 ? null : (absoluteVsTools / toolAssisted.primary_score) * 100;
  const pricing = getPricingMetadata(model) ?? {
    model,
    currency: "USD" as const,
    input_per_million: 0,
    cached_input_per_million: 0,
    output_per_million: 0,
    effective_date: "n/a",
    source_note: "Model pricing unavailable; cost treated as an estimate of zero.",
  };
  const summary: AgentReportSummary = {
    evaluation_version: "4.0.0",
    timestamp: new Date().toISOString(),
    prompt_version: promptVersion,
    baseline_reference: baseline,
    tool_assisted_reference: toolAssisted,
    comparison: {
      absolute_change_points: absoluteVsBaseline,
      relative_change_percent: relativeVsBaseline,
      tool_absolute_change_points: absoluteVsTools,
      tool_relative_change_percent: relativeVsTools,
    },
    model_name: model,
    reasoning_effort: reasoningEffort,
    pricing,
    case_count: caseReports.length,
    ...summarizeRunScope({
      totalCases: allCases.length,
      completedCases: caseReports.length,
      requestedLimit: limit,
      requestedCaseIds: caseIds,
    }),
    primary_metric: {
      name: "Correctly Handled Buying Opportunity Rate",
      score: primaryScore,
      passed_cases: passedCases,
      total_cases: caseReports.length,
    },
    secondary_metrics: summarizeScores(caseReports),
    aggregate_counts: {
      passing_cases: passedCases,
      failing_cases: caseReports.length - passedCases,
    },
    runtime_ms: Math.round(performance.now() - startedAt),
    total_api_cost_usd: totalCost,
    average_cost_usd: caseReports.length === 0 ? 0 : totalCost / caseReports.length,
    average_latency_ms: caseReports.length === 0 ? 0 : totalLatency / caseReports.length,
    retries: totalRetries,
    environment_versions: {
      node: process.version,
      npm: parseNpmVersion(),
      typescript: typescriptVersion,
      vitest: vitestVersion,
      platform: process.platform,
      arch: process.arch,
    },
    correct_escalations: correctEscalations,
    safety_violations_total: safetyViolationsTotal,
    policy_violations_total: policyViolationsTotal,
    trace_directory: join("traces", "runtime-agent", "model-driven", mode, buildAgentRunLabel(model, promptVersion)),
    cases: caseReports,
  };

  const paths = writeAgentReports(summary);
  process.stdout.write(
    `Wrote ${paths.jsonPath} and ${paths.markdownPath}\nPrimary score: ${summary.primary_metric.score.toFixed(2)}%\nBaseline delta: ${summary.comparison.absolute_change_points >= 0 ? "+" : ""}${summary.comparison.absolute_change_points.toFixed(2)} points\nTotal cost: $${summary.total_api_cost_usd.toFixed(4)}\n`,
  );
}

const isDirectExecution = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectExecution) {
  await main();
}
