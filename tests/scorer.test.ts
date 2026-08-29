import { describe, expect, it } from "vitest";
import { loadEvaluationCases } from "../src/evaluation/loader.js";
import { runDeterministicBaseline } from "../src/baseline/baseline.js";
import { scoreCase } from "../src/evaluation/scorer.js";

describe("scorer", () => {
  it("produces a full per-case score with failed dimensions", () => {
    const cases = loadEvaluationCases();
    const scored = scoreCase(cases[0]!.authoring, runDeterministicBaseline(cases[0]!.runnable));

    expect(scored.case_id).toBe("LB-001");
    expect(typeof scored.pass).toBe("boolean");
    expect(Array.isArray(scored.failed_dimensions)).toBe(true);
    expect(scored.failed_dimensions.length).toBeGreaterThanOrEqual(0);
    expect(scored.expected).toBeDefined();
    expect(scored.prediction).toBeDefined();
  });
});
