import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSyntheticFixtures, validateSyntheticFixtures } from "../src/data/fixtures.js";
import { loadEvaluationCases } from "../src/evaluation/loader.js";
import { runDeterministicBaseline } from "../src/baseline/baseline.js";
import { runToolAssistedWorkflow } from "../src/workflow/tool-assisted.js";
import {
  checkInventory,
  evaluateOffer,
  findProductByPost,
  getDeliveryOptions,
  identifyMissingOrderFields,
  searchCatalogue,
} from "../src/tools/verified-tools.js";

describe("Phase 3 synthetic fixtures", () => {
  it("validate the synthetic store and omit case-only fields", () => {
    const fixtures = loadSyntheticFixtures();
    const issues = validateSyntheticFixtures(fixtures);
    expect(issues).toEqual([]);
    expect(fixtures.products.map((product) => product.product_id)).toHaveLength(8);
    expect(new Set(fixtures.products.map((product) => product.sku)).size).toBe(8);
    expect(fixtures.negotiation_policies.every((policy) => policy.minimum_permitted_price_ugx <= policy.listed_price_ugx)).toBe(true);
    const raw = readFileSync("data/products.json", "utf8");
    expect(raw).not.toContain('"case_id"');
    expect(raw).not.toContain('"expected"');
  });

  it("keeps the frozen baseline at 20.00%", () => {
    const baseline = JSON.parse(readFileSync("evaluation/results/baseline.json", "utf8")) as {
      primary_metric: { score: number };
    };
    expect(baseline.primary_metric.score).toBe(20);
  });

  it("returns the expected controlled tool outcomes", () => {
    expect(findProductByPost("facebook", "fb-post-001").outcome).toBe("found");
    expect(searchCatalogue("ceramic umbrella").outcome).toBe("not_found");
    expect(searchCatalogue("blue").outcome).toBe("ambiguous");
    expect(checkInventory("UG-PRD-108", "red").outcome).toBe("unavailable");
    expect(getDeliveryOptions("Jinja Town").outcome).toBe("found");
    expect(getDeliveryOptions("Somewhere Else").outcome).toBe("unavailable");
    expect(evaluateOffer("UG-PRD-102", 43000, 10).data?.outcome).toBe("within_policy");
    expect(evaluateOffer("UG-PRD-105", 70000, 3).data?.outcome).toBe("below_minimum");
    expect(evaluateOffer("UG-PRD-105", 70000, 3).data?.customer_facing_summary ?? "").not.toContain("90000");
    expect(identifyMissingOrderFields({ product_id: "UG-PRD-105", quantity: 3 }).data?.missing_fields).toContain("invoice_request");
  });
});

describe("Phase 3 workflow", () => {
  it("uses post mappings and catalogue search without leaking authoring fields", () => {
    const run = runToolAssistedWorkflow(loadEvaluationCases()[0].runnable);
    expect(run.prediction.product_id).toBe("UG-PRD-101");
    expect(run.prediction.intent_labels).toContain("pricing_request");
    expect(Object.keys(run.prediction)).not.toContain("expected");
    expect(Object.keys(run.prediction)).not.toContain("case_id");
  });

  it("handles stock, order capture, injection, and combined delivery negotiation", () => {
    const cases = loadEvaluationCases();
    const stock = runToolAssistedWorkflow(cases[7].runnable);
    const order = runToolAssistedWorkflow(cases[10].runnable);
    const injection = runToolAssistedWorkflow(cases[15].runnable);
    const combined = runToolAssistedWorkflow(cases[19].runnable);

    expect(stock.prediction.intent_labels).toContain("unavailable_stock_request");
    expect(order.prediction.intent_labels).toContain("confirmed_order_intent");
    expect(order.prediction.order_fields).toEqual(["quantity", "payment_timing", "invoice_request"]);
    expect(injection.prediction.intent_labels).toEqual(["prompt_injection"]);
    expect(injection.prediction.escalation).toBe(true);
    expect(combined.prediction.intent_labels).toEqual([
      "variant_request",
      "quantity_request",
      "negotiation",
      "inventory_constraint",
      "delivery_constraint",
    ]);
    expect(combined.prediction.action).toBe("negotiate_with_inventory_and_delivery_constraints");
  });

  it("keeps the spam, complaint, phone and duplicate paths separated", () => {
    const cases = loadEvaluationCases();
    const spam = runToolAssistedWorkflow(cases[12].runnable);
    const complaint = runToolAssistedWorkflow(cases[13].runnable);
    const phone = runToolAssistedWorkflow(cases[14].runnable);
    const duplicate = runToolAssistedWorkflow(cases[17].runnable);

    expect(spam.prediction.is_lead).toBe(false);
    expect(complaint.prediction.intent_labels).toEqual(["complaint", "refund_request"]);
    expect(phone.prediction.intent_labels).toEqual(["phone_call_request", "human_handoff"]);
    expect(duplicate.prediction.intent_labels).toContain("duplicate_inquiry");
  });
});

describe("Phase 3 evaluation outputs", () => {
  it("keeps the baseline report intact and verifies the tool-assisted report when present", () => {
    const baseline = JSON.parse(readFileSync("evaluation/results/baseline.json", "utf8")) as {
      primary_metric: { score: number; passed_cases: number; total_cases: number };
    };
    expect(baseline.primary_metric.score).toBe(20);
    expect(baseline.primary_metric.total_cases).toBe(20);

    const toolJsonPath = "evaluation/results/tool-assisted.json";
    const toolMdPath = "evaluation/results/tool-assisted.md";
    if (!existsSync(toolJsonPath) || !existsSync(toolMdPath)) {
      return;
    }

    const toolJson = JSON.parse(readFileSync(toolJsonPath, "utf8")) as {
      case_count: number;
      primary_metric: { score: number; passed_cases: number; total_cases: number };
      aggregate_counts: { passing_cases: number; failing_cases: number };
      cases: Array<{ case_id: string; pass: boolean; failed_dimensions: string[] }>;
    };
    const toolMd = readFileSync(toolMdPath, "utf8");
    expect(toolJson.case_count).toBe(20);
    expect(toolJson.primary_metric.total_cases).toBe(20);
    expect(toolJson.aggregate_counts.passing_cases + toolJson.aggregate_counts.failing_cases).toBe(20);
    expect(toolMd).toContain("Tool-Assisted Evaluation Report");
    expect(toolMd).toContain(`Primary metric: Correctly Handled Buying Opportunity Rate = ${toolJson.primary_metric.score.toFixed(2)}%`);
    expect(toolJson.cases.length).toBe(20);
  });
});
