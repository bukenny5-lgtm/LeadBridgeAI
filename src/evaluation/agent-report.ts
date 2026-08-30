import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CaseScore } from "./scorer.js";
import type { AgentCaseResult, AgentEvaluationSummary } from "../agent/types.js";
import type { RunnableEvaluationCase } from "./case-schema.js";
import { readBaselineComparison } from "./tool-report.js";

export interface AgentCaseReport extends CaseScore {
  prompt_version: string;
  model: string;
  reasoning_effort: string | null;
  execution_mode: AgentCaseResult["execution_mode"];
  verified_tools_prediction: AgentCaseResult["verified_tools_prediction"];
  model_proposal: AgentCaseResult["model_proposal"];
  evidence_bundle: {
    evidence_refs: string[];
    tool_names: string[];
    product_refs: string[];
    inventory_refs: string[];
    delivery_refs: string[];
    business_refs: string[];
    policy_refs: string[];
  };
  policy_decision: AgentCaseResult["policy_decision"];
  policy_overrides: AgentCaseResult["policy_overrides"];
  claim_validation: AgentCaseResult["claim_validation"];
  final_output: AgentCaseResult["final_output"];
  tool_events: AgentCaseResult["tool_events"];
  turns: AgentCaseResult["turns"];
  approval_required: true;
  approval_queue: AgentCaseResult["approval_queue"];
  escalation_required: boolean;
  escalation_reason: string | null;
  total_tool_calls: number;
  total_model_turns: number;
  validation_failures: string[];
  retries: number;
  runtime_ms: number;
  api_cost_usd: number;
  usage: AgentCaseResult["usage"];
  usage_source: AgentCaseResult["usage_source"];
  safety_violations: string[];
  evidence_refs: string[];
  trace_path: string;
}

export interface AgentReportSummary extends AgentEvaluationSummary {
  tool_assisted_reference: {
    evaluation_file: string;
    primary_score: number;
    passed_cases: number;
    total_cases: number;
  };
  partial_run: boolean;
  requested_limit: number | null;
  completed_cases: number;
  not_authoritative: boolean;
  correct_escalations: number;
  safety_violations_total: number;
  policy_violations_total: number;
  trace_directory: string;
  cases: AgentCaseReport[];
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function slugify(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readToolAssistedComparison(): {
  evaluation_file: string;
  primary_score: number;
  passed_cases: number;
  total_cases: number;
} {
  const toolPath = join("evaluation", "results", "tool-assisted.json");
  const raw = JSON.parse(readFileSync(toolPath, "utf8")) as {
    primary_metric: { score: number; passed_cases: number; total_cases: number };
  };
  return {
    evaluation_file: toolPath,
    primary_score: raw.primary_metric.score,
    passed_cases: raw.primary_metric.passed_cases,
    total_cases: raw.primary_metric.total_cases,
  };
}

export function buildAgentResultLabel(model: string): string {
  const slug = slugify(model);
  if (slug.includes("mock")) return "mock";
  if (slug.includes("luna")) return "luna";
  if (slug.includes("terra")) return "terra";
  return slug || "agent";
}

function isV2Prompt(promptVersion: string): boolean {
  return /\bv2\b/.test(promptVersion);
}

export function buildAgentRunLabel(model: string, promptVersion: string): string {
  const label = buildAgentResultLabel(model);
  if (/hybrid/i.test(promptVersion)) {
    return "hybrid-v1";
  }
  return isV2Prompt(promptVersion) ? `${label}-v2` : label;
}

export function buildAgentReportStem(summary: AgentReportSummary): string {
  const label = buildAgentResultLabel(summary.model_name);
  if (/hybrid/i.test(summary.prompt_version)) {
    return `agent-hybrid-${label}`;
  }
  if (summary.partial_run) {
    const requestedLimit = summary.requested_limit ?? summary.completed_cases;
    if (isV2Prompt(summary.prompt_version)) {
      return `agent-${label}-v2-limit-${requestedLimit}`;
    }
    return `agent-${label}-limit-${requestedLimit}`;
  }
  return `agent-${label}`;
}

export function writeAgentReports(summary: AgentReportSummary): {
  jsonPath: string;
  markdownPath: string;
} {
  const stem = buildAgentReportStem(summary);
  const jsonPath = join("evaluation", "results", `${stem}.json`);
  const markdownPath = join("evaluation", "results", `${stem}.md`);
  mkdirSync(dirname(jsonPath), { recursive: true });
  const publicSummary = {
    ...summary,
    cases: summary.cases.map((caseResult) => {
      const { expected: _expected, ...publicCaseResult } = caseResult;
      return publicCaseResult;
    }),
  };
  writeFileSync(jsonPath, `${JSON.stringify(publicSummary, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, toMarkdown(summary), "utf8");
  return { jsonPath, markdownPath };
}

function toMarkdown(summary: AgentReportSummary): string {
  const lines: string[] = [];
  lines.push(`# Model-Driven Agent Evaluation Report`);
  lines.push("");
  lines.push(`- Evaluation version: ${summary.evaluation_version}`);
  lines.push(`- Timestamp: ${summary.timestamp}`);
  lines.push(`- Prompt version: ${summary.prompt_version}`);
  lines.push(`- Model: ${summary.model_name}`);
  lines.push(`- Reasoning effort: ${summary.reasoning_effort ?? "n/a"}`);
  lines.push(`- Baseline reference: ${summary.baseline_reference.evaluation_file} (${percent(summary.baseline_reference.primary_score)})`);
  lines.push(`- Tool-assisted reference: ${summary.tool_assisted_reference.evaluation_file} (${percent(summary.tool_assisted_reference.primary_score)})`);
  lines.push("## Run Scope");
  lines.push("");
  lines.push(`- Partial run: ${summary.partial_run}`);
  lines.push(`- Requested limit: ${summary.requested_limit ?? "n/a"}`);
  lines.push(`- Completed cases: ${summary.completed_cases}`);
  lines.push(`- Not authoritative: ${summary.not_authoritative}`);
  lines.push("");
  lines.push(
    `- Baseline comparison: ${summary.comparison.absolute_change_points >= 0 ? "+" : ""}${summary.comparison.absolute_change_points.toFixed(2)} points (${summary.comparison.relative_change_percent === null ? "n/a" : `${summary.comparison.relative_change_percent.toFixed(2)}%`})`,
  );
  lines.push(
    `- Tool-assisted comparison: ${summary.comparison.tool_absolute_change_points >= 0 ? "+" : ""}${summary.comparison.tool_absolute_change_points.toFixed(2)} points (${summary.comparison.tool_relative_change_percent === null ? "n/a" : `${summary.comparison.tool_relative_change_percent.toFixed(2)}%`})`,
  );
  lines.push(`- Case count: ${summary.case_count}`);
  lines.push(
    `- Primary metric: ${summary.primary_metric.name} = ${percent(summary.primary_metric.score)} (${summary.primary_metric.passed_cases}/${summary.primary_metric.total_cases})`,
  );
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`- Correct escalations: ${summary.correct_escalations}`);
  lines.push(`- Safety violations: ${summary.safety_violations_total}`);
  lines.push(`- Policy violations: ${summary.policy_violations_total}`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- Intent accuracy: ${percent(summary.secondary_metrics.intent_accuracy)}`);
  lines.push(`- Escalation accuracy: ${percent(summary.secondary_metrics.escalation_accuracy)}`);
  lines.push(`- Factual integrity: ${percent(summary.secondary_metrics.factual_integrity)}`);
  lines.push(`- Policy safety: ${percent(summary.secondary_metrics.policy_safety)}`);
  lines.push(`- Runtime: ${summary.runtime_ms} ms`);
  lines.push(`- Total API cost: $${summary.total_api_cost_usd.toFixed(4)}`);
  lines.push(`- Average cost per case: $${summary.average_cost_usd.toFixed(4)}`);
  lines.push(`- Average latency per case: ${summary.average_latency_ms.toFixed(2)} ms`);
  lines.push(`- Retries: ${summary.retries}`);
  lines.push("");
  lines.push("## Pricing");
  lines.push("");
  lines.push(`- Model: ${summary.pricing.model}`);
  lines.push(`- Currency: ${summary.pricing.currency}`);
  lines.push(`- Input / 1M: ${summary.pricing.input_per_million}`);
  lines.push(`- Cached input / 1M: ${summary.pricing.cached_input_per_million}`);
  lines.push(`- Output / 1M: ${summary.pricing.output_per_million}`);
  lines.push(`- Effective date: ${summary.pricing.effective_date}`);
  lines.push(`- Source note: ${summary.pricing.source_note}`);
  lines.push("");
  lines.push("## Case Results");
  lines.push("");
  lines.push("| Case | Pass | Failed Dimensions | Escalation | Cost | Latency | Trace |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const caseResult of summary.cases) {
    lines.push(
      `| ${caseResult.case_id} | ${caseResult.pass ? "PASS" : "FAIL"} | ${caseResult.failed_dimensions.join(", ") || "None"} | ${caseResult.escalation_required ? "Yes" : "No"} | $${caseResult.api_cost_usd.toFixed(4)} | ${caseResult.runtime_ms} ms | ${caseResult.trace_path} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function writeAgentTrajectoryMarkdown(
  filePath: string,
  caseRecord: RunnableEvaluationCase,
  caseResult: {
    execution_mode: AgentCaseResult["execution_mode"];
    verified_tools_prediction: AgentCaseResult["verified_tools_prediction"];
    model_proposal: AgentCaseResult["model_proposal"];
    evidence_bundle: {
      evidence_refs: string[];
      tool_names: string[];
      product_refs: string[];
      inventory_refs: string[];
      delivery_refs: string[];
      business_refs: string[];
      policy_refs: string[];
    };
    policy_decision: AgentCaseResult["policy_decision"];
    policy_overrides: AgentCaseResult["policy_overrides"];
    claim_validation: AgentCaseResult["claim_validation"];
    turns: AgentCaseResult["turns"];
    tool_events: AgentCaseResult["tool_events"];
    approval_required: true;
    approval_queue: AgentCaseResult["approval_queue"];
    escalation_required: boolean;
    escalation_reason: string | null;
    prediction: AgentCaseResult["prediction"];
    usage: AgentCaseResult["usage"];
    api_cost_usd: number;
    runtime_ms: number;
  },
  promptVersion: string,
  model: string,
  mode: "mock" | "live",
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const lines: string[] = [];
  lines.push(`# Model-Driven Trajectory`);
  lines.push("");
  lines.push(`- Mode: ${mode}`);
  lines.push(`- Prompt version: ${promptVersion}`);
  lines.push(`- Model: ${model}`);
  lines.push(`- Execution mode: ${caseResult.execution_mode}`);
  lines.push(`- Case input: ${JSON.stringify(caseRecord, null, 2)}`);
  lines.push("");
  lines.push("## Turns");
  lines.push("");
  lines.push("## Verified Tools Backbone");
  lines.push("");
  lines.push(`- Prediction: ${JSON.stringify(caseResult.verified_tools_prediction, null, 2)}`);
  lines.push("");
  lines.push("## Model Proposal");
  lines.push("");
  lines.push(`- Proposal: ${JSON.stringify(caseResult.model_proposal, null, 2)}`);
  lines.push("");
  lines.push("## Evidence Bundle");
  lines.push("");
  lines.push(`- Evidence refs: ${caseResult.evidence_bundle.evidence_refs.join(", ") || "none"}`);
  lines.push(`- Tool names: ${caseResult.evidence_bundle.tool_names.join(", ") || "none"}`);
  lines.push(`- Product refs: ${caseResult.evidence_bundle.product_refs.join(", ") || "none"}`);
  lines.push(`- Inventory refs: ${caseResult.evidence_bundle.inventory_refs.join(", ") || "none"}`);
  lines.push(`- Delivery refs: ${caseResult.evidence_bundle.delivery_refs.join(", ") || "none"}`);
  lines.push(`- Business refs: ${caseResult.evidence_bundle.business_refs.join(", ") || "none"}`);
  lines.push(`- Policy refs: ${caseResult.evidence_bundle.policy_refs.join(", ") || "none"}`);
  lines.push("");
  lines.push("## Claim Ledger");
  lines.push("");
  for (const claim of caseResult.claim_validation) {
    lines.push(`- ${claim.claim_type}`);
    lines.push(`  - Validation: ${claim.validation_status}`);
    lines.push(`  - Proposed value: ${claim.proposed_value ?? "n/a"}`);
    lines.push(`  - Evidence ref: ${claim.evidence_ref ?? "none"}`);
    lines.push(`  - Safe customer value: ${claim.safe_customer_value ?? "n/a"}`);
    lines.push(`  - Reason: ${claim.reason}`);
  }
  lines.push("");
  lines.push("## Policy Decision");
  lines.push("");
  lines.push(`- Approval required: ${caseResult.policy_decision.approval_required}`);
  lines.push(`- Approval queue: ${caseResult.policy_decision.approval_queue}`);
  lines.push(`- Escalation required: ${caseResult.policy_decision.escalation_required}`);
  lines.push(`- Escalation reason: ${caseResult.policy_decision.escalation_reason ?? "n/a"}`);
  lines.push(`- Overrides: ${caseResult.policy_overrides.length}`);
  for (const override of caseResult.policy_overrides) {
    lines.push(
      `  - ${override.field}: ${JSON.stringify(override.proposed_value)} [${override.policy_result}] (${override.reason_code})${override.evidence_refs.length ? ` refs=${override.evidence_refs.join(", ")}` : ""}`,
    );
  }
  lines.push("");
  for (const turn of caseResult.turns) {
    lines.push(`### Turn ${turn.turn_index}`);
    lines.push(`- Response ID: ${turn.response_id ?? "n/a"}`);
    lines.push(`- Model: ${turn.model}`);
    lines.push(`- Output text: ${turn.output_text ?? "n/a"}`);
    lines.push(`- Tool calls: ${turn.tool_calls.map((call) => call.name).join(", ") || "none"}`);
    lines.push(`- Usage: ${turn.usage ? JSON.stringify(turn.usage) : "n/a"}`);
    lines.push(`- Latency: ${turn.latency_ms} ms`);
    lines.push(`- Retries: ${turn.retries}`);
    if (turn.validation.length > 0) {
      lines.push(`- Validation: ${turn.validation.map((entry) => `${entry.kind}:${entry.passed ? "pass" : "fail"}:${entry.detail}`).join(" | ")}`);
    }
    lines.push("");
  }
  lines.push("## Tool Events");
  lines.push("");
  for (const event of caseResult.tool_events) {
    lines.push(`- ${event.tool_name}`);
    lines.push(`  - Call ID: ${event.call_id}`);
    lines.push(`  - Outcome: ${event.outcome}`);
    lines.push(`  - Args: ${JSON.stringify(event.sanitized_args)}`);
    lines.push(`  - Evidence: ${event.evidence_refs.join(", ") || "none"}`);
    lines.push(`  - Duration: ${event.duration_ms} ms`);
    if (event.error_category) {
      lines.push(`  - Error: ${event.error_category}`);
    }
  }
  lines.push("");
  lines.push("## Structured Output");
  lines.push("");
  lines.push(`- Approval required: ${caseResult.approval_required}`);
  lines.push(`- Approval queue: ${caseResult.approval_queue}`);
  lines.push(`- Escalation required: ${caseResult.escalation_required}`);
  lines.push(`- Escalation reason: ${caseResult.escalation_reason ?? "n/a"}`);
  lines.push(`- Final prediction: ${JSON.stringify(caseResult.prediction, null, 2)}`);
  lines.push("");
  lines.push("## Cost");
  lines.push("");
  lines.push(`- API usage: ${caseResult.usage ? JSON.stringify(caseResult.usage) : "n/a"}`);
  lines.push(`- Cost: $${caseResult.api_cost_usd.toFixed(4)}`);
  lines.push(`- Runtime: ${caseResult.runtime_ms} ms`);
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

export function readBaselineSummary(): {
  evaluation_file: string;
  primary_score: number;
  passed_cases: number;
  total_cases: number;
} {
  const baseline = readBaselineComparison();
  return {
    evaluation_file: baseline.baseline_path,
    primary_score: baseline.baseline_primary_score,
    passed_cases: baseline.baseline_passed_cases,
    total_cases: baseline.baseline_total_cases,
  };
}
