import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadEvaluationCases } from "../src/evaluation/loader.js";
import { runToolAssistedWorkflow } from "../src/workflow/tool-assisted.js";
import { buildAgentReportStem, buildAgentResultLabel, writeAgentTrajectoryMarkdown } from "../src/evaluation/agent-report.js";
import { estimateUsageCostUsd } from "../src/agent/cost.js";
import { getControlledToolDefinitions } from "../src/agent/tool-catalog.js";
import { MockAgentProvider, OpenAIResponsesProvider } from "../src/agent/providers.js";
import { runAgentCase } from "../src/agent/orchestrator.js";
import { summarizeRunScope } from "../src/evaluation/run-agent.js";
import { assertLiveConfirmation } from "../src/evaluation/run-agent.js";
import type { RunnableEvaluationCase } from "../src/evaluation/case-schema.js";
import { readFileSync as readTextFileSync } from "node:fs";
import { readFileSync as readBinary } from "node:fs";

function buildRequest(caseRecord = loadEvaluationCases()[0]!.runnable) {
  return {
    caseRecord,
    promptVersion: "sales-agent-v1",
    instructions: "test",
    toolDefinitions: getControlledToolDefinitions(),
    turnIndex: 1,
    previousResponseId: null,
    repairErrors: [],
    toolObservations: [],
    toolEvents: [],
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    maxOutputTokens: 400,
    responseSchemaName: "sales_agent_v1_final_output",
    mode: "live" as const,
  };
}

describe("phase 4 agent", () => {
  const savedConfirm = process.env.LIVE_EVAL_CONFIRM;

  beforeEach(() => {
    process.env.LIVE_EVAL_CONFIRM = savedConfirm;
  });

  afterEach(() => {
    process.env.LIVE_EVAL_CONFIRM = savedConfirm;
  });

  it("refuses a live run without confirmation before network access", () => {
    delete process.env.LIVE_EVAL_CONFIRM;
    expect(() => assertLiveConfirmation("live")).toThrow("LIVE_EVAL_CONFIRM=YES");
  });

  it("refuses a live provider call without an API key before fetch", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network should not be called");
    });
    const provider = new OpenAIResponsesProvider({ apiKey: "", fetchImpl: fetchSpy as unknown as typeof fetch });
    await expect(provider.generate(buildRequest())).rejects.toThrow("OPENAI_API_KEY is required");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes a simple price case through tools and produces an approved prediction", async () => {
    const cases = loadEvaluationCases();
    const provider = new MockAgentProvider();
    const execution = await runAgentCase(cases[0]!.runnable, provider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });

    expect(execution.final_output.approval_required).toBe(true);
    expect(execution.approval_queue).toBe("normal");
    expect(execution.prediction.action).toBe("reply_with_verified_price");
    expect(execution.prediction.product_id).toBe("UG-PRD-101");
    expect(execution.tool_events.map((event) => event.tool_name)).toContain("findProductByPost");
    expect(execution.tool_events.map((event) => event.tool_name)).toContain("getNegotiationPolicy");
    expect(execution.final_output.response_draft).not.toContain("sent");
    expect(JSON.stringify(execution.final_output)).not.toContain("expected");
  });

  it("keeps mock and hybrid runs on distinct execution paths", async () => {
    const cases = loadEvaluationCases();

    const mockProvider = new MockAgentProvider();
    const mockExecution = await runAgentCase(cases[0]!.runnable, mockProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v2",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });

    const hybridProvider = new MockAgentProvider();
    const hybridExecution = await runAgentCase(cases[0]!.runnable, hybridProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-hybrid-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });

    const verified = runToolAssistedWorkflow(cases[0]!.runnable);

    expect(mockExecution.execution_mode).toBe("model-led");
    expect(hybridExecution.execution_mode).toBe("verified-tools-backed");
    expect(hybridExecution.verified_tools_prediction).toEqual(verified.prediction);
    expect(hybridExecution.final_output.prediction).toEqual(verified.prediction);
  });

  it("handles prompt injection, confidentiality, unavailable stock, and incomplete orders", async () => {
    const cases = loadEvaluationCases();
    const provider = new MockAgentProvider();

    const injection = await runAgentCase(cases[15]!.runnable, provider, {
      caseId: cases[15]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    const unsupportedPrice = await runAgentCase(cases[6]!.runnable, provider, {
      caseId: cases[6]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    const unavailableStock = await runAgentCase(cases[7]!.runnable, provider, {
      caseId: cases[7]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    const confirmedOrder = await runAgentCase(cases[10]!.runnable, provider, {
      caseId: cases[10]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });

    expect(injection.prediction.intent_labels).toContain("prompt_injection");
    expect(injection.escalation_required).toBe(true);
    expect(unsupportedPrice.prediction.intent_labels).toContain("price_offer_below_minimum");
    expect(unsupportedPrice.final_output.response_draft).not.toContain("90000");
    expect(unsupportedPrice.final_output.response_draft).not.toContain("minimum");
    expect(unavailableStock.prediction.intent_labels).toContain("unavailable_stock_request");
    expect(unavailableStock.prediction.action).toBe("explain_unavailable_stock_and_offer_waitlist");
    expect(confirmedOrder.prediction.action).toBe("capture_provisional_order_details");
    expect(confirmedOrder.prediction.order_fields).toEqual(["quantity", "payment_timing", "invoice_request"]);
  });

  it("rejects unknown tools, invalid arguments, repeated calls, and excessive turns", async () => {
    const cases = loadEvaluationCases();

    const unknownToolProvider = new MockAgentProvider({
      script: [
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-1", name: "notARealTool", arguments: {} }],
        },
      ],
    });
    const unknownTool = await runAgentCase(cases[0]!.runnable, unknownToolProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(unknownTool.validation_failures.join(" ")).toContain("Unknown tool name");
    expect(unknownTool.escalation_required).toBe(true);

    const invalidArgsProvider = new MockAgentProvider({
      script: [
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-2", name: "getProduct", arguments: {} }],
        },
      ],
    });
    const invalidArgs = await runAgentCase(cases[0]!.runnable, invalidArgsProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(invalidArgs.validation_failures.join(" ")).toContain("Missing required argument productId");

    const repeatedProvider = new MockAgentProvider({
      script: [
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-3", name: "searchCatalogue", arguments: { query: "blue bottle" } }],
        },
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-4", name: "searchCatalogue", arguments: { query: "blue bottle" } }],
        },
      ],
    });
    const repeated = await runAgentCase(cases[0]!.runnable, repeatedProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(repeated.validation_failures.join(" ")).toContain("Repeated identical tool call rejected");

    const maxTurnsProvider = new MockAgentProvider({
      script: Array.from({ length: 9 }, (_, index) => ({
        kind: "tool_calls" as const,
        tool_calls: [{ call_id: `call-${index + 1}`, name: "searchCatalogue", arguments: { query: `query ${index}` } }],
      })),
    });
    const maxTurns = await runAgentCase(cases[0]!.runnable, maxTurnsProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(maxTurns.validation_failures.join(" ")).toContain("Model turn limit reached");
  });

  it("repairs invalid structured output once and then falls back safely when needed", async () => {
    const cases = loadEvaluationCases();

    const repairedProvider = new MockAgentProvider({
      script: [
        {
          kind: "tool_calls",
          tool_calls: [
            { call_id: "call-1", name: "findProductByPost", arguments: { channel: "facebook", postId: "fb-post-001" } },
            { call_id: "call-2", name: "getNegotiationPolicy", arguments: { productId: "UG-PRD-101", quantity: 1 } },
          ],
        },
        { kind: "invalid_output", output_text: "not json" },
        {
          kind: "final_output",
          output: {
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
          },
        },
      ],
    });
    const repaired = await runAgentCase(cases[0]!.runnable, repairedProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(repaired.validation_failures.some((entry) => entry.includes("not valid JSON"))).toBe(true);
    expect(repaired.prediction.action).toBe("reply_with_verified_price");

    const fallbackProvider = new MockAgentProvider({
      script: [{ kind: "invalid_output", output_text: "still invalid" }, { kind: "invalid_output", output_text: "still invalid" }],
    });
    const fallback = await runAgentCase(cases[0]!.runnable, fallbackProvider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    expect(fallback.escalation_required).toBe(true);
    expect(fallback.approval_queue).toBe("specialized");
    expect(fallback.escalation_reason).toMatch(/.+/);
  });

  it("writes sanitized traces without secrets or expected answers", async () => {
    const cases = loadEvaluationCases();
    const provider = new MockAgentProvider();
    const execution = await runAgentCase(cases[0]!.runnable, provider, {
      caseId: cases[0]!.case_id,
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });
    const traceDir = mkdtempSync(join(tmpdir(), "leadbridge-trace-"));
    const tracePath = join(traceDir, "case.md");
    writeAgentTrajectoryMarkdown(tracePath, cases[0]!.runnable, execution, "sales-agent-v1", "mock-agent", "mock");
    const traceText = readFileSync(tracePath, "utf8");
    expect(traceText).not.toContain("OPENAI_API_KEY");
    expect(traceText).not.toContain("expected");
    expect(traceText).toContain("sales-agent-v1");
    expect(traceText).toContain("mock-agent");
  });

  it("calculates Luna pricing from API usage", () => {
    const cost = estimateUsageCostUsd(
      {
        input_tokens: 1_000_000,
        cached_input_tokens: 100_000,
        output_tokens: 100_000,
        reasoning_tokens: 10_000,
        total_tokens: 1_100_000,
      },
      "gpt-5.6-luna",
    );
    expect(cost).toBeCloseTo(0.302, 3);
  });

  it("keeps the frozen baseline and verified-tools scores unchanged", () => {
    const baseline = JSON.parse(readFileSync("evaluation/results/baseline.json", "utf8")) as {
      primary_metric: { score: number };
    };
    const toolAssisted = JSON.parse(readFileSync("evaluation/results/tool-assisted.json", "utf8")) as {
      primary_metric: { score: number };
    };
    expect(baseline.primary_metric.score).toBe(20);
    expect(toolAssisted.primary_metric.score).toBe(60);
  });

  it("marks limited evaluations as partial and non-authoritative", () => {
    expect(
      summarizeRunScope({
        totalCases: 20,
        completedCases: 1,
        requestedLimit: 1,
        requestedCaseIds: [],
      }),
    ).toEqual({
      partial_run: true,
      requested_limit: 1,
      completed_cases: 1,
      not_authoritative: true,
    });
  });

  it("selects stable report filenames for partial and complete live evaluations", () => {
    expect(
      buildAgentReportStem({
        evaluation_version: "4.0.0",
        timestamp: "2026-08-29T00:00:00.000Z",
        prompt_version: "sales-agent-v1",
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
        case_count: 1,
        partial_run: true,
        requested_limit: 1,
        completed_cases: 1,
        not_authoritative: true,
        primary_metric: { name: "metric", score: 100, passed_cases: 1, total_cases: 1 },
        secondary_metrics: { intent_accuracy: 100, escalation_accuracy: 100, factual_integrity: 100, policy_safety: 100 },
        aggregate_counts: { passing_cases: 1, failing_cases: 0 },
        runtime_ms: 1,
        total_api_cost_usd: 0.1,
        average_cost_usd: 0.1,
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
        correct_escalations: 1,
        safety_violations_total: 0,
        policy_violations_total: 0,
        trace_directory: "traces/runtime-agent/model-driven/live/luna",
        cases: [],
      } as const),
    ).toBe("agent-luna-limit-1");

    expect(
      buildAgentReportStem({
        evaluation_version: "4.0.0",
        timestamp: "2026-08-29T00:00:00.000Z",
        prompt_version: "sales-agent-v1",
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
        case_count: 20,
        partial_run: false,
        requested_limit: 20,
        completed_cases: 20,
        not_authoritative: false,
        primary_metric: { name: "metric", score: 20, passed_cases: 4, total_cases: 20 },
        secondary_metrics: { intent_accuracy: 100, escalation_accuracy: 100, factual_integrity: 100, policy_safety: 100 },
        aggregate_counts: { passing_cases: 20, failing_cases: 0 },
        runtime_ms: 1,
        total_api_cost_usd: 0.1,
        average_cost_usd: 0.1,
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
        correct_escalations: 20,
        safety_violations_total: 0,
        policy_violations_total: 0,
        trace_directory: "traces/runtime-agent/model-driven/live/luna",
        cases: [],
      } as const),
    ).toBe("agent-luna");
  });

  it("keeps a verified price inquiry on the score-compatible intent and order-field contract after a repeated tool call", async () => {
    const caseRecord: RunnableEvaluationCase = {
      channel: "facebook",
      post_id: "fb-post-001",
      conversation: [
        {
          role: "customer",
          text: "How much is the cobalt water bottle today?",
          timestamp: "2026-08-01T09:00:00+03:00",
        },
      ],
      business_description: "Synthetic East African retail and order-handling context for evaluation only.",
    };

    const provider = new MockAgentProvider({
      script: [
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-1", name: "findProductByPost", arguments: { channel: "facebook", postId: "fb-post-001" } }],
        },
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-2", name: "getNegotiationPolicy", arguments: { productId: "UG-PRD-101", quantity: null } }],
        },
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-3", name: "getProduct", arguments: { productId: "UG-PRD-101" } }],
        },
        {
          kind: "tool_calls",
          tool_calls: [{ call_id: "call-4", name: "getNegotiationPolicy", arguments: { productId: "UG-PRD-101", quantity: null } }],
        },
      ],
    });

    const execution = await runAgentCase(caseRecord, provider, {
      caseId: "LB-GENERIC",
      promptVersion: "sales-agent-v1",
      model: "mock-agent",
      reasoningEffort: null,
      mode: "mock",
    });

    expect(execution.validation_failures.join(" ")).toContain("Repeated identical tool call rejected");
    expect(execution.approval_queue).toBe("normal");
    expect(execution.escalation_required).toBe(false);
    expect(execution.prediction.intent_labels).toEqual(["pricing_request"]);
    expect(execution.prediction.order_fields).toBeNull();
    expect(execution.final_output.response_draft).not.toContain("human review");
  });
});
