import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EvaluationSummary } from "./scorer.js";
import type { ToolAssistedRun } from "../workflow/tool-assisted.js";
import type { ToolTraceRecord } from "../tools/verified-tools.js";

export interface ToolCaseScore {
  case_id: string;
  pass: boolean;
  failed_dimensions: string[];
  prediction: import("./case-schema.js").Prediction;
  expected: import("./case-schema.js").AuthoringEvaluationCase["expected"];
  tool_calls: ToolTraceRecord[];
  evidence_refs: string[];
  route: string;
}

export interface ToolEvaluationSummary {
  evaluation_version: string;
  timestamp: string;
  baseline_reference: {
    evaluation_file: string;
    primary_score: number;
    passed_cases: number;
    total_cases: number;
  };
  comparison: {
    absolute_change_points: number;
    relative_change_percent: number | null;
  };
  baseline_name: string;
  baseline_description: string;
  tool_assisted_name: string;
  tool_assisted_description: string;
  resource_boundary: string[];
  exact_command: string;
  case_count: number;
  primary_metric: {
    name: string;
    score: number;
    passed_cases: number;
    total_cases: number;
  };
  secondary_metrics: EvaluationSummary["secondary_metrics"];
  aggregate_counts: {
    passing_cases: number;
    failing_cases: number;
  };
  runtime_ms: number;
  model_api_cost_usd: number;
  environment_versions: EvaluationSummary["environment_versions"];
  cases: ToolCaseScore[];
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function toMarkdown(summary: ToolEvaluationSummary): string {
  const lines: string[] = [];
  lines.push(`# Tool-Assisted Evaluation Report`);
  lines.push("");
  lines.push(`- Evaluation version: ${summary.evaluation_version}`);
  lines.push(`- Timestamp: ${summary.timestamp}`);
  lines.push(`- Baseline reference: ${summary.baseline_reference.evaluation_file} (${percent(summary.baseline_reference.primary_score)})`);
  lines.push(`- Comparison: ${summary.comparison.absolute_change_points >= 0 ? "+" : ""}${summary.comparison.absolute_change_points.toFixed(2)} points`);
  lines.push(`- Relative change: ${summary.comparison.relative_change_percent === null ? "n/a" : `${summary.comparison.relative_change_percent.toFixed(2)}%`}`);
  lines.push(`- Tool-assisted baseline: ${summary.tool_assisted_name}`);
  lines.push(`- Description: ${summary.tool_assisted_description}`);
  lines.push(`- Exact command: \`${summary.exact_command}\``);
  lines.push(`- Case count: ${summary.case_count}`);
  lines.push(
    `- Primary metric: ${summary.primary_metric.name} = ${percent(summary.primary_metric.score)} (${summary.primary_metric.passed_cases}/${summary.primary_metric.total_cases})`,
  );
  lines.push("");
  lines.push("## Secondary Metrics");
  lines.push("");
  lines.push(`- Intent accuracy: ${percent(summary.secondary_metrics.intent_accuracy)}`);
  lines.push(`- Escalation accuracy: ${percent(summary.secondary_metrics.escalation_accuracy)}`);
  lines.push(`- Factual integrity: ${percent(summary.secondary_metrics.factual_integrity)}`);
  lines.push(`- Policy safety: ${percent(summary.secondary_metrics.policy_safety)}`);
  lines.push("");
  lines.push("## Aggregate Counts");
  lines.push("");
  lines.push(`- Passing cases: ${summary.aggregate_counts.passing_cases}`);
  lines.push(`- Failing cases: ${summary.aggregate_counts.failing_cases}`);
  lines.push(`- Runtime: ${summary.runtime_ms} ms`);
  lines.push(`- Model/API cost: $${summary.model_api_cost_usd.toFixed(2)}`);
  lines.push("");
  lines.push("## Per-Case Results");
  lines.push("");
  lines.push("| Case | Pass | Failed Dimensions | Tools |");
  lines.push("| --- | --- | --- | --- |");
  for (const caseScore of summary.cases) {
    lines.push(
      `| ${caseScore.case_id} | ${caseScore.pass ? "PASS" : "FAIL"} | ${caseScore.failed_dimensions.join(", ") || "None"} | ${caseScore.tool_calls.map((call) => call.tool_name).join(" -> ")} |`,
    );
  }
  lines.push("");
  lines.push("## Tool Evidence");
  lines.push("");
  for (const caseScore of summary.cases) {
    lines.push(`### ${caseScore.case_id}`);
    lines.push(`- Route: ${caseScore.route || "n/a"}`);
    lines.push(`- Evidence: ${caseScore.evidence_refs.join(", ") || "none"}`);
    for (const call of caseScore.tool_calls) {
      lines.push(`- Tool: ${call.tool_name}`);
      lines.push(`  - Outcome: ${call.outcome}`);
      lines.push(`  - Args: ${JSON.stringify(call.sanitized_args)}`);
      lines.push(`  - Evidence: ${call.evidence_refs.join(", ") || "none"}`);
      lines.push(`  - Duration: ${call.duration_ms} ms`);
      if (call.error_category) {
        lines.push(`  - Error: ${call.error_category}`);
      }
    }
    lines.push("");
  }
  lines.push("## Notes");
  lines.push("");
  lines.push("- This iteration isolates verified tools and synthetic data, not model reasoning.");
  lines.push("- The frozen baseline report remains unchanged.");
  return `${lines.join("\n")}\n`;
}

export function writeToolAssistedReports(summary: ToolEvaluationSummary): {
  jsonPath: string;
  markdownPath: string;
} {
  const jsonPath = join("evaluation", "results", "tool-assisted.json");
  const markdownPath = join("evaluation", "results", "tool-assisted.md");
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, toMarkdown(summary), "utf8");
  return { jsonPath, markdownPath };
}

export function readBaselineComparison(): {
  baseline_path: string;
  baseline_primary_score: number;
  baseline_passed_cases: number;
  baseline_total_cases: number;
} {
  const baselinePath = join("evaluation", "results", "baseline.json");
  const raw = JSON.parse(readFileSync(baselinePath, "utf8")) as {
    primary_metric: { score: number; passed_cases: number; total_cases: number };
  };
  return {
    baseline_path: baselinePath,
    baseline_primary_score: raw.primary_metric.score,
    baseline_passed_cases: raw.primary_metric.passed_cases,
    baseline_total_cases: raw.primary_metric.total_cases,
  };
}

export function writeTrajectoryMarkdown(filePath: string, title: string, run: ToolAssistedRun): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- Route: ${run.route}`);
  lines.push(`- Evidence: ${run.evidence_refs.join(", ") || "none"}`);
  lines.push(`- Final prediction: ${JSON.stringify(run.prediction, null, 2)}`);
  lines.push("");
  lines.push("## Tool Calls");
  lines.push("");
  for (const call of run.tool_calls) {
    lines.push(`- ${call.tool_name}`);
    lines.push(`  - Outcome: ${call.outcome}`);
    lines.push(`  - Args: ${JSON.stringify(call.sanitized_args)}`);
    lines.push(`  - Evidence: ${call.evidence_refs.join(", ") || "none"}`);
    lines.push(`  - Duration: ${call.duration_ms} ms`);
    if (call.error_category) {
      lines.push(`  - Error: ${call.error_category}`);
    }
  }
  lines.push("");
  lines.push("## Workflow Decision");
  lines.push("");
  lines.push(`- Approval or escalation: ${run.prediction.escalation ? "escalation required" : "normal approval queue"}`);
  lines.push(`- Provisional order: ${run.prediction.provisional_order ? "yes" : "no"}`);
  lines.push("");
  lines.push("- Sanitized and synthetic only.");
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}
