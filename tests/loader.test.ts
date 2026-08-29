import { describe, expect, it } from "vitest";
import { loadEvaluationCases } from "../src/evaluation/loader.js";

describe("evaluation loader", () => {
  it("loads 20 runnable cases and strips authoring-only fields", () => {
    const cases = loadEvaluationCases();
    expect(cases).toHaveLength(20);

    const caseIds = new Set(cases.map((entry) => entry.case_id));
    expect(caseIds.size).toBe(20);

    const runnable = cases[0]?.runnable;
    expect(runnable).toBeDefined();
    if (!runnable) {
      return;
    }

    expect(runnable).toEqual(
      expect.objectContaining({
        channel: expect.any(String),
        post_id: expect.anything(),
        conversation: expect.any(Array),
        business_description: expect.any(String),
      }),
    );
    expect(runnable).not.toHaveProperty("expected");
    expect(runnable).not.toHaveProperty("rationale");
    expect(runnable).not.toHaveProperty("prohibited");
    expect(runnable).not.toHaveProperty("context");
    expect(runnable).not.toHaveProperty("score");
    expect(runnable).not.toHaveProperty("scoring");
    expect(runnable).not.toHaveProperty("case_id");
    expect(runnable).not.toHaveProperty("title");
  });
});
