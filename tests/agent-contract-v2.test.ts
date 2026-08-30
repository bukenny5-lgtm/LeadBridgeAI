import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AGENT_MODEL_PROPOSAL_JSON_SCHEMA,
  validateModelProposal,
} from "../src/agent/validation.js";
import {
  CANONICAL_CONFIDENCE_LEVELS,
  CANONICAL_INTENT_LABELS,
} from "../src/evaluation/canonical-contract.js";
import { buildAgentReportStem } from "../src/evaluation/agent-report.js";
import { loadEvaluationCases } from "../src/evaluation/loader.js";
import { normalizeLegacyProposal } from "../src/agent/policy.js";

const validProposal = {
  proposal_version: "sales-agent-proposal-v1",
  language: "en",
  normalized_customer_meaning: "Customer wants the verified price for a product.",
  canonical_intent_candidates: ["pricing_request"],
  explicitly_stated_entities: [
    {
      entity_type: "quantity",
      normalized_value: "1",
      source_text: "How much is it?",
      source_message_ref: "message:0",
      confidence: "high",
      inferred: false,
    },
  ],
  product_reference_candidates: [
    {
      normalized_value: "blue bottle",
      source_text: "blue bottle",
      source_message_ref: "message:0",
      confidence: "high",
      inferred: false,
    },
  ],
  ambiguity: [],
  clarification_question: null,
  requested_tools: [
    {
      tool_name: "getNegotiationPolicy",
      arguments: { productId: "UG-PRD-101", quantity: 1 },
      reason: "check the verified pricing and negotiation policy",
      confidence: "high",
    },
  ],
  response_style: "concise, helpful, evidence-gated",
  draft_suggestion: "Thanks for reaching out. I’ll verify the request and prepare a draft for approval.",
  confidence: "high",
  reasoning_summary: "reply_with_verified_price; Customer wants the verified price for a product.",
} as const;

describe("prompt v2 contract", () => {
  it("documents the canonical contract rules in the v2 prompt", () => {
    const prompt = readFileSync("prompts/sales-agent-v2.md", "utf8");
    expect(prompt).toContain("proposal schema exactly");
    expect(prompt).toContain("proposal_version");
    expect(prompt).toContain("canonical_intent_candidates");
    expect(prompt).toContain("approval_required` is always `true` in the downstream policy output");
    expect(prompt).toContain("Do not infer stock from product existence");
    expect(prompt).toContain("Duplicate identical tool requests must be suppressed");
  });

  it("uses the canonical enums in the structured output schema", () => {
    const schema = AGENT_MODEL_PROPOSAL_JSON_SCHEMA as any;

    expect(schema.properties.canonical_intent_candidates.items.enum).toEqual(CANONICAL_INTENT_LABELS);
    expect(schema.properties.confidence.enum).toEqual(CANONICAL_CONFIDENCE_LEVELS);
    expect(schema.properties.requested_tools.items.properties.confidence.enum).toEqual(CANONICAL_CONFIDENCE_LEVELS);
  });

  it("rejects noncanonical labels and duplicate tool requests", () => {
    expect(() =>
      validateModelProposal(
        {
          ...validProposal,
          canonical_intent_candidates: ["price_inquiry"],
        },
      ),
    ).toThrow(/one of/);

    expect(() =>
      validateModelProposal(
        {
          ...validProposal,
          requested_tools: [...validProposal.requested_tools, validProposal.requested_tools[0]!],
        },
      ),
    ).toThrow(/duplicate tool requests/);
  });

  it("normalizes a legacy final-output payload into the proposal contract before policy enforcement", () => {
    const caseRecord = loadEvaluationCases()[0]!.runnable;
    const legacy = {
      response_draft: "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
      approval_required: true,
      approval_queue: "normal",
      escalation_required: false,
      escalation_reason: null,
      evidence_refs: ["post:facebook:fb-post-001", "product:UG-PRD-101", "policy:NEG-101"],
      confidence: "high",
      lead_decision: "create_lead",
      provisional_order_decision: "do_not_prepare_provisional_order",
      extracted_order_fields: null,
      missing_order_fields: null,
      intents: ["pricing_request"],
      product_association: {
        status: "associated",
        product_id: "UG-PRD-101",
        clarification_question: null,
      },
      prediction: {
        response_text: "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
        is_lead: true,
        intent_labels: ["pricing_request"],
        product_id: "UG-PRD-101",
        action: "reply_with_verified_price",
        escalation: false,
        lead_creation: true,
        provisional_order: false,
        order_fields: null,
      },
    } as const;

    const normalized = normalizeLegacyProposal(legacy, caseRecord, []);
    if (!normalized) {
      throw new Error("Expected legacy proposal to normalize");
    }
    expect(normalized.canonical_intent_candidates).toEqual(["pricing_request"]);
    expect(normalized.draft_suggestion).toContain("verify the request");
    expect(() => validateModelProposal(normalized)).not.toThrow();
  });

  it("keeps partial v2 report filenames versioned", () => {
    expect(
      buildAgentReportStem({
        evaluation_version: "4.0.0",
        timestamp: "2026-08-29T00:00:00.000Z",
        prompt_version: "sales-agent-v2",
        baseline_reference: { evaluation_file: "evaluation/results/baseline.json", primary_score: 20, passed_cases: 4, total_cases: 20 },
        tool_assisted_reference: {
          evaluation_file: "evaluation/results/tool-assisted.json",
          primary_score: 60,
          passed_cases: 12,
          total_cases: 20,
        },
        comparison: {
          absolute_change_points: 0,
          relative_change_percent: 0,
          tool_absolute_change_points: 0,
          tool_relative_change_percent: 0,
        },
        model_name: "gpt-5.6-luna",
        reasoning_effort: "low",
        pricing: {
          model: "gpt-5.6-luna",
          currency: "USD",
          input_per_million: 0.2,
          cached_input_per_million: 0.02,
          output_per_million: 1.2,
          effective_date: "2026-08-29",
          source_note: "test",
        },
        case_count: 5,
        partial_run: true,
        requested_limit: 5,
        completed_cases: 5,
        not_authoritative: true,
        primary_metric: { name: "metric", score: 0, passed_cases: 0, total_cases: 5 },
        secondary_metrics: { intent_accuracy: 0, escalation_accuracy: 0, factual_integrity: 0, policy_safety: 0 },
        aggregate_counts: { passing_cases: 0, failing_cases: 5 },
        runtime_ms: 1,
        total_api_cost_usd: 0,
        average_cost_usd: 0,
        average_latency_ms: 1,
        retries: 0,
        environment_versions: {
          node: "node",
          npm: "npm",
          typescript: "ts",
          vitest: "vitest",
          platform: "win32",
          arch: "x64",
        },
        correct_escalations: 0,
        safety_violations_total: 0,
        policy_violations_total: 0,
        trace_directory: "traces/runtime-agent/model-driven/live/luna-v2",
        cases: [],
      } as const),
    ).toBe("agent-luna-v2-limit-5");
  });
});
