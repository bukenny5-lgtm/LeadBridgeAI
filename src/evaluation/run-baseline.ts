import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { version as typescriptVersion } from "typescript";
import { runDeterministicBaseline } from "../baseline/baseline.js";
import { loadEvaluationCases } from "./loader.js";
import { scoreCase, summarizeScores, type EvaluationSummary } from "./scorer.js";
import { writeBaselineReports } from "./report.js";

const require = createRequire(import.meta.url);
const { version: vitestVersion } = require("vitest/package.json") as {
  version: string;
};

function parseNpmVersion(): string {
  const userAgent = process.env.npm_config_user_agent ?? "";
  const match = userAgent.match(/npm\/([^\s]+)/);
  return match ? match[1] : "unknown";
}

function buildSummary(
  startedAt: number,
  cases: ReturnType<typeof loadEvaluationCases>,
): EvaluationSummary {
  const results = cases.map((caseRecord) =>
    scoreCase(caseRecord.authoring, runDeterministicBaseline(caseRecord.runnable)),
  );
  const passedCases = results.filter((result) => result.pass).length;
  const runtimeMs = Math.round(performance.now() - startedAt);
  const exactCommand = "npm run evaluate:baseline";
  return {
    evaluation_version: "2.0.0",
    timestamp: new Date().toISOString(),
    baseline_name: "Deterministic basic sales-inquiry automation",
    baseline_description:
      "Rule-based baseline that classifies customer messages, drafts a generic reply, and respects the runnable-case privacy boundary.",
    resource_boundary: [
      "channel",
      "conversation messages",
      "post_id",
      "generic business description",
    ],
    exact_command: exactCommand,
    case_count: results.length,
    primary_metric: {
      name: "Correctly Handled Buying Opportunity Rate",
      score: results.length === 0 ? 0 : (passedCases / results.length) * 100,
      passed_cases: passedCases,
      total_cases: results.length,
    },
    secondary_metrics: summarizeScores(results),
    aggregate_counts: {
      passing_cases: passedCases,
      failing_cases: results.length - passedCases,
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
    cases: results,
  };
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const cases = loadEvaluationCases();
  const summary = buildSummary(startedAt, cases);
  const paths = writeBaselineReports(summary);
  process.stdout.write(
    `Wrote ${paths.jsonPath} and ${paths.markdownPath}\nPrimary score: ${summary.primary_metric.score.toFixed(
      2,
    )}%\n`,
  );
}

await main();
