import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { join } from "node:path";
import { version as typescriptVersion } from "typescript";
import { loadEvaluationCases } from "./loader.js";
import { scoreCase, summarizeScores, type EvaluationSummary } from "./scorer.js";
import {
  readBaselineComparison,
  type ToolCaseScore,
  type ToolEvaluationSummary,
  writeToolAssistedReports,
  writeTrajectoryMarkdown,
} from "./tool-report.js";
import { runToolAssistedWorkflow } from "../workflow/tool-assisted.js";
import type { RunnableEvaluationCase } from "./case-schema.js";

const require = createRequire(import.meta.url);
const { version: vitestVersion } = require("vitest/package.json") as { version: string };

function parseNpmVersion(): string {
  const userAgent = process.env.npm_config_user_agent ?? "";
  const match = userAgent.match(/npm\/([^\s]+)/);
  return match ? match[1] : "unknown";
}

function buildSummary(
  startedAt: number,
  cases: ReturnType<typeof loadEvaluationCases>,
): ToolEvaluationSummary {
  const runs = cases.map((caseRecord) => {
    const run = runToolAssistedWorkflow(caseRecord.runnable);
    const scored = scoreCase(caseRecord.authoring, run.prediction);
    return {
      ...scored,
      tool_calls: run.tool_calls,
      evidence_refs: run.evidence_refs,
      route: run.route,
    } satisfies ToolCaseScore;
  });
  const passedCases = runs.filter((result) => result.pass).length;
  const runtimeMs = Math.round(performance.now() - startedAt);
  const baseline = readBaselineComparison();
  const toolScore = runs.length === 0 ? 0 : (passedCases / runs.length) * 100;
  const absoluteChange = toolScore - baseline.baseline_primary_score;
  const relativeChange =
    baseline.baseline_primary_score === 0
      ? null
      : (absoluteChange / baseline.baseline_primary_score) * 100;
  return {
    evaluation_version: "3.0.0",
    timestamp: new Date().toISOString(),
    baseline_reference: {
      evaluation_file: baseline.baseline_path,
      primary_score: baseline.baseline_primary_score,
      passed_cases: baseline.baseline_passed_cases,
      total_cases: baseline.baseline_total_cases,
    },
    comparison: {
      absolute_change_points: absoluteChange,
      relative_change_percent: relativeChange,
    },
    baseline_name: "Deterministic basic sales-inquiry automation",
    baseline_description:
      "Frozen rule-based baseline used as the stable comparison point for the tool-assisted workflow.",
    tool_assisted_name: "Deterministic verified-tool workflow",
    tool_assisted_description:
      "Rule-based workflow that uses synthetic business data and controlled read-only tools to isolate the value of verified context.",
    resource_boundary: [
      "channel",
      "conversation messages",
      "post_id",
      "generic business description",
      "synthetic business data",
      "controlled read-only tools",
    ],
    exact_command: "npm run evaluate:tools",
    case_count: runs.length,
    primary_metric: {
      name: "Correctly Handled Buying Opportunity Rate",
      score: toolScore,
      passed_cases: passedCases,
      total_cases: runs.length,
    },
    secondary_metrics: summarizeScores(runs),
    aggregate_counts: {
      passing_cases: passedCases,
      failing_cases: runs.length - passedCases,
    },
    runtime_ms: runtimeMs,
    model_api_cost_usd: 0,
    environment_versions: {
      node: process.version,
      npm: parseNpmVersion(),
      typescript: typescriptVersion,
      vitest: vitestVersion,
      platform: process.platform,
      arch: process.arch,
    },
    cases: runs,
  };
}

function writeRepresentativeTrajectories(cases: ReturnType<typeof loadEvaluationCases>): void {
  const byId = new Map(cases.map((entry) => [entry.case_id, entry] as const));
  const trajectories: Array<[string, string, RunnableEvaluationCase]> = [];
  const addCase = (caseId: string, filename: string) => {
    const entry = byId.get(caseId);
    if (entry) {
      trajectories.push([filename, caseId, entry.runnable]);
    }
  };
  addCase("LB-001", "01-price-inquiry.md");
  addCase("LB-003", "02-product-image-request.md");
  addCase("LB-005", "03-delivery-question.md");
  addCase("LB-006", "04-in-policy-negotiation.md");
  addCase("LB-007", "05-below-minimum-negotiation.md");
  addCase("LB-011", "06-confirmed-order-missing-fields.md");
  addCase("LB-016", "07-prompt-injection.md");
  addCase("LB-018", "08-failure-case.md");

  for (const [filename, caseId, runnable] of trajectories) {
    const run = runToolAssistedWorkflow(runnable);
    writeTrajectoryMarkdown(
      join("traces", "runtime-agent", "tool-assisted", filename),
      `Trajectory for ${caseId}`,
      run,
    );
  }

  const unavailableVariantCase: RunnableEvaluationCase = {
    channel: "instagram",
    post_id: "ig-post-020",
    conversation: [
      {
        role: "customer",
        text: "Do you have the red version of the 750ml flask?",
        timestamp: "2026-08-29T09:00:00+03:00",
      },
    ],
    business_description: "Synthetic retail context",
  };
  writeTrajectoryMarkdown(
    join("traces", "runtime-agent", "tool-assisted", "09-unavailable-variant.md"),
    "Trajectory for unavailable variant",
    runToolAssistedWorkflow(unavailableVariantCase),
  );
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const cases = loadEvaluationCases();
  const summary = buildSummary(startedAt, cases);
  const paths = writeToolAssistedReports(summary);
  writeRepresentativeTrajectories(cases);
  process.stdout.write(
    `Wrote ${paths.jsonPath} and ${paths.markdownPath}\nPrimary score: ${summary.primary_metric.score.toFixed(2)}%\nBaseline delta: ${summary.comparison.absolute_change_points >= 0 ? "+" : ""}${summary.comparison.absolute_change_points.toFixed(2)} points\n`,
  );
}

await main();
