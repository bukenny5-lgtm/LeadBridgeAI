import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EvaluationSummary } from "./scorer.js";

export function writeBaselineReports(summary: EvaluationSummary): {
  jsonPath: string;
  markdownPath: string;
} {
  const jsonPath = join("evaluation", "results", "baseline.json");
  const markdownPath = join("evaluation", "results", "baseline.md");
  mkdirSync(dirname(jsonPath), { recursive: true });

  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, toMarkdown(summary), "utf8");

  return { jsonPath, markdownPath };
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function toMarkdown(summary: EvaluationSummary): string {
  const lines: string[] = [];
  lines.push(`# Baseline Evaluation Report`);
  lines.push("");
  lines.push(`- Evaluation version: ${summary.evaluation_version}`);
  lines.push(`- Timestamp: ${summary.timestamp}`);
  lines.push(`- Baseline: ${summary.baseline_name}`);
  lines.push(`- Description: ${summary.baseline_description}`);
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
  lines.push("## Environment");
  lines.push("");
  lines.push(`- Node: ${summary.environment_versions.node}`);
  lines.push(`- npm: ${summary.environment_versions.npm}`);
  lines.push(`- TypeScript: ${summary.environment_versions.typescript}`);
  lines.push(`- Vitest: ${summary.environment_versions.vitest}`);
  lines.push(`- Platform: ${summary.environment_versions.platform}`);
  lines.push(`- Arch: ${summary.environment_versions.arch}`);
  lines.push("");
  lines.push("## Per-Case Results");
  lines.push("");
  lines.push("| Case | Pass | Failed Dimensions |");
  lines.push("| --- | --- | --- |");
  for (const caseScore of summary.cases) {
    lines.push(
      `| ${caseScore.case_id} | ${caseScore.pass ? "PASS" : "FAIL"} | ${caseScore.failed_dimensions.join(", ") || "None"} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}
