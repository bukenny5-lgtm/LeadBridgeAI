import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { loadPromptFile } from "./providers.js";
import { planToolCalls } from "./heuristics.js";
import { getControlledToolDefinitions, getControlledToolRuntime } from "./tool-catalog.js";
import { validateModelProposal } from "./validation.js";
import { enforceHybridPolicy, inferPolicyFromConversation, normalizeLegacyProposal } from "./policy.js";
import type {
  ClaimValidationResult,
  EvidenceBundle,
  ModelProposal,
  PolicyDecision,
  PolicyOverride,
} from "./policy.js";
import { estimateUsageCostUsd, getPricingMetadata } from "./cost.js";
import { runToolAssistedWorkflow } from "../workflow/tool-assisted.js";
import type {
  AgentCaseResult,
  AgentExecutionContext,
  AgentFinalOutput,
  AgentModelResponse,
  AgentModelUsage,
  AgentToolEvent,
  AgentToolObservation,
  AgentTurnTrace,
  AgentValidationEvent,
} from "./types.js";
import type { Prediction, RunnableEvaluationCase } from "../evaluation/case-schema.js";
import type { AgentGenerationRequest, AgentProvider } from "./providers.js";

function stableToolFingerprint(name: string, args: Record<string, unknown>): string {
  return createHash("sha1").update(`${name}:${JSON.stringify(args)}`).digest("hex");
}

function safeClone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function validateToolArguments(toolName: string, args: Record<string, unknown>): void {
  const required: Record<
    string,
    { type: "string" | "integer" | "number" | "boolean" | "object"; required?: boolean; nullable?: boolean }
  > = {};
  if (toolName === "findProductByPost") {
    required.channel = { type: "string", required: true };
    required.postId = { type: "string", required: true };
  } else if (toolName === "searchCatalogue") {
    required.query = { type: "string", required: true };
  } else if (toolName === "getProduct" || toolName === "getRelatedProducts" || toolName === "getProductImages") {
    required.productId = { type: "string", required: true };
  } else if (toolName === "checkInventory") {
    required.productId = { type: "string", required: true };
    required.requestedVariant = { type: "string", required: true, nullable: true };
  } else if (toolName === "getDeliveryOptions") {
    required.destination = { type: "string", required: true, nullable: true };
  } else if (toolName === "getNegotiationPolicy") {
    required.productId = { type: "string", required: true };
    required.quantity = { type: "integer", required: true, nullable: true };
  } else if (toolName === "evaluateOffer") {
    required.productId = { type: "string", required: true };
    required.offeredPrice = { type: "integer", required: true };
    required.quantity = { type: "integer", required: true, nullable: true };
  } else if (toolName === "identifyMissingOrderFields") {
    required.orderDraft = { type: "object", required: true };
    return;
  } else if (toolName === "getBusinessLocation") {
    return;
  }
  for (const [key, descriptor] of Object.entries(required)) {
    const value = args[key];
    if (descriptor.required && value === undefined) {
      throw new Error(`Missing required argument ${key} for tool ${toolName}`);
    }
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      if (descriptor.nullable) {
        continue;
      }
      throw new Error(`Expected ${key} to be non-null for tool ${toolName}`);
    }
    if (descriptor.type === "string" && typeof value !== "string") {
      throw new Error(`Expected ${key} to be a string for tool ${toolName}`);
    }
    if (descriptor.type === "integer" && (typeof value !== "number" || !Number.isInteger(value))) {
      throw new Error(`Expected ${key} to be an integer for tool ${toolName}`);
    }
    if (descriptor.type === "number" && typeof value !== "number") {
      throw new Error(`Expected ${key} to be a number for tool ${toolName}`);
    }
    if (descriptor.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`Expected ${key} to be a boolean for tool ${toolName}`);
    }
  }
}

function parseStructuredOutput(text: string): unknown {
  const trimmed = text.trim();
  return JSON.parse(trimmed);
}

function parseModelProposal(
  parsed: unknown,
  caseRecord: RunnableEvaluationCase,
  observations: AgentToolObservation[],
): ReturnType<typeof validateModelProposal> {
  try {
    return validateModelProposal(parsed);
  } catch (validationError) {
    const legacyProposal = normalizeLegacyProposal(parsed, caseRecord, observations);
    if (legacyProposal) {
      return legacyProposal;
    }
    throw validationError;
  }
}

function detectUnsupportedClaims(text: string): string[] {
  const lower = text.toLowerCase();
  const violations: string[] = [];
  if (/\bminimum price\b|\bprice floor\b|\bhidden price\b/.test(lower)) {
    violations.push("confidential_price_disclosure");
  }
  if (/\bin stock\b|\bavailable\b|\bdelivery\b|\bwill deliver\b/.test(lower) && /\bguarantee\b|\bpromise\b/.test(lower)) {
    violations.push("unsupported_commitment");
  }
  return violations;
}

function sanitizePredictionForTrace(output: AgentFinalOutput): Record<string, unknown> {
  return {
    response_draft: output.response_draft,
    approval_required: output.approval_required,
    approval_queue: output.approval_queue,
    escalation_required: output.escalation_required,
    escalation_reason: output.escalation_reason,
    evidence_refs: output.evidence_refs,
    confidence: output.confidence,
    lead_decision: output.lead_decision,
    provisional_order_decision: output.provisional_order_decision,
    extracted_order_fields: output.extracted_order_fields,
    missing_order_fields: output.missing_order_fields,
    intents: output.intents,
    product_association: output.product_association,
    prediction: output.prediction,
  };
}

export interface AgentExecutionResult {
  case_id: string;
  prompt_version: string;
  model: string;
  reasoning_effort: string | null;
  execution_mode: "model-led" | "verified-tools-backed";
  verified_tools_prediction: Prediction;
  model_proposal: ModelProposal;
  evidence_bundle: EvidenceBundle;
  policy_decision: PolicyDecision;
  policy_overrides: PolicyOverride[];
  claim_validation: ClaimValidationResult[];
  final_output: AgentFinalOutput;
  prediction: AgentFinalOutput["prediction"];
  turns: AgentTurnTrace[];
  tool_events: AgentToolEvent[];
  tool_observations: AgentToolObservation[];
  validation_failures: string[];
  safety_violations: string[];
  api_usage: AgentModelUsage | null;
  api_cost_usd: number;
  total_model_turns: number;
  total_tool_calls: number;
  retries: number;
  runtime_ms: number;
  response_id: string | null;
  usage: AgentModelUsage | null;
  trace_markdown: string;
  approval_required: true;
  approval_queue: "normal" | "specialized";
  escalation_required: boolean;
  escalation_reason: string | null;
  prompt_instructions: string;
}

export async function runAgentCase(
  caseRecord: RunnableEvaluationCase,
  provider: AgentProvider,
  options: {
    caseId: string;
    promptVersion: string;
    model: string;
    reasoningEffort: string | null;
    maxModelTurns?: number;
    maxToolCalls?: number;
    maxOutputTokens?: number;
    mode: "mock" | "live";
  },
): Promise<AgentExecutionResult> {
  const startedAt = performance.now();
  const promptInstructions = loadPromptFile(options.promptVersion);
  const executionMode: AgentExecutionResult["execution_mode"] = /hybrid/i.test(options.promptVersion)
    ? "verified-tools-backed"
    : "model-led";
  const verifiedToolsRun = executionMode === "verified-tools-backed" ? runToolAssistedWorkflow(caseRecord) : null;
  const toolDefinitions = getControlledToolDefinitions();
  const toolEvents: AgentToolEvent[] = [];
  const toolObservations: AgentToolObservation[] = [];
  const turns: AgentTurnTrace[] = [];
  const validationFailures: string[] = [];
  const safetyViolations: string[] = [];
  const seenToolFingerprints = new Set<string>();
  let previousResponseId: string | null = null;
  let totalToolCalls = 0;
  let totalRetries = 0;
  let finalOutput: AgentFinalOutput | null = null;
  let modelProposal: ModelProposal | null = null;
  let policyDecision: ReturnType<typeof enforceHybridPolicy>["policy_decision"] | null = null;
  let evidenceBundle: ReturnType<typeof enforceHybridPolicy>["evidence_bundle"] | null = null;
  let responseId: string | null = null;
  const maxModelTurns = options.maxModelTurns ?? 8;
  const maxToolCalls = options.maxToolCalls ?? 12;
  const maxOutputTokens = options.maxOutputTokens ?? 1200;

  for (let turnIndex = 1; turnIndex <= maxModelTurns; turnIndex += 1) {
    const request: AgentGenerationRequest = {
      caseRecord,
      promptVersion: options.promptVersion,
      instructions: promptInstructions,
      toolDefinitions,
      turnIndex,
      previousResponseId,
      repairErrors: validationFailures.slice(-2),
      toolObservations,
      toolEvents,
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      maxOutputTokens,
      responseSchemaName: `${options.promptVersion.replace(/-/g, "_")}_proposal`,
      mode: options.mode,
    };

    const response = await provider.generate(request);
    responseId = response.response_id;
    totalRetries += response.retries;

    const turnValidation: AgentValidationEvent[] = [];

    if (response.tool_calls.length > 0) {
      for (const call of response.tool_calls) {
        if (totalToolCalls >= maxToolCalls) {
          validationFailures.push("Maximum tool calls exceeded");
          turnValidation.push({
            kind: "tool_rejection",
            passed: false,
            detail: "Maximum tool calls exceeded",
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            "maximum tool calls exceeded",
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }
        const runtime = getControlledToolRuntime(call.name);
        if (!runtime) {
          validationFailures.push(`Unknown tool name: ${call.name}`);
          turnValidation.push({
            kind: "tool_rejection",
            passed: false,
            detail: `Unknown tool name: ${call.name}`,
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            `unknown tool name: ${call.name}`,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }
        try {
          validateToolArguments(call.name, call.arguments);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          validationFailures.push(message);
          turnValidation.push({
            kind: "tool_argument_validation",
            passed: false,
            detail: message,
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            message,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }

        const fingerprint = stableToolFingerprint(call.name, call.arguments);
        if (seenToolFingerprints.has(fingerprint)) {
          const message = `Repeated identical tool call rejected: ${call.name}`;
          validationFailures.push(message);
          turnValidation.push({
            kind: "tool_rejection",
            passed: false,
            detail: message,
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            null,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }
        seenToolFingerprints.add(fingerprint);

        const executed = runtime.execute(call.arguments);
        totalToolCalls += 1;
        toolEvents.push({
          ...executed.trace,
          call_id: call.call_id,
        });
        toolObservations.push({
          tool_name: call.name,
          call_id: call.call_id,
          outcome: executed.outcome,
          evidence_refs: executed.evidence_refs,
          data: executed.data,
        });
      }
      turns.push({
        turn_index: turnIndex,
        response_id: response.response_id,
        model: response.model,
        output_text: response.output_text,
        tool_calls: response.tool_calls,
        validation: turnValidation,
        usage: response.usage,
        latency_ms: response.latency_ms,
        retries: response.retries,
      });
      previousResponseId = response.response_id;
      if (finalOutput) {
        break;
      }
      continue;
    }

    if (!response.output_text) {
      const message = "Missing structured output";
      validationFailures.push(message);
      turnValidation.push({ kind: "structured_output_validation", passed: false, detail: message });
      if (validationFailures.length >= 1) {
        const repairRequest: AgentGenerationRequest = {
          ...request,
          turnIndex: turnIndex + 1,
          previousResponseId,
          repairErrors: validationFailures.slice(-3),
          toolDefinitions: [],
        };
        const repairResponse = await provider.generate(repairRequest);
        totalRetries += repairResponse.retries;
        if (repairResponse.tool_calls.length > 0 || !repairResponse.output_text) {
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            "repair attempt failed to produce structured output",
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          turns.push({
            turn_index: turnIndex + 1,
            response_id: repairResponse.response_id,
            model: repairResponse.model,
            output_text: repairResponse.output_text,
            tool_calls: repairResponse.tool_calls,
            validation: [
              { kind: "repair_attempt", passed: false, detail: "Repair attempt failed" },
              { kind: "structured_output_validation", passed: false, detail: "Invalid repair output" },
            ],
            usage: repairResponse.usage,
            latency_ms: repairResponse.latency_ms,
            retries: repairResponse.retries,
          });
          break;
        }
        try {
           const parsed = parseStructuredOutput(repairResponse.output_text);
           const proposal = parseModelProposal(parsed, caseRecord, toolObservations);
           const policyOutcome = enforceHybridPolicy(
            caseRecord,
            proposal,
            toolObservations,
            null,
            verifiedToolsRun?.prediction ?? null,
          );
           modelProposal = policyOutcome.model_proposal;
           policyDecision = policyOutcome.policy_decision;
           evidenceBundle = policyOutcome.evidence_bundle;
           finalOutput = policyOutcome.final_output;
          turns.push({
            turn_index: turnIndex + 1,
            response_id: repairResponse.response_id,
            model: repairResponse.model,
            output_text: repairResponse.output_text,
            tool_calls: repairResponse.tool_calls,
            validation: [
              { kind: "repair_attempt", passed: true, detail: "Repair attempt succeeded" },
              { kind: "structured_output_validation", passed: true, detail: "Validated repaired output" },
            ],
            usage: repairResponse.usage,
            latency_ms: repairResponse.latency_ms,
            retries: repairResponse.retries,
          });
          previousResponseId = repairResponse.response_id;
          responseId = repairResponse.response_id;
          totalRetries += repairResponse.retries;
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          validationFailures.push(message);
          turns.push({
            turn_index: turnIndex + 1,
            response_id: repairResponse.response_id,
            model: repairResponse.model,
            output_text: repairResponse.output_text,
            tool_calls: repairResponse.tool_calls,
            validation: [
              { kind: "repair_attempt", passed: true, detail: "Repair attempted" },
              { kind: "structured_output_validation", passed: false, detail: message },
            ],
            usage: repairResponse.usage,
            latency_ms: repairResponse.latency_ms,
            retries: repairResponse.retries,
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            message,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }
      }
      continue;
    }

    try {
      const parsed = parseStructuredOutput(response.output_text);
      const proposal = parseModelProposal(parsed, caseRecord, toolObservations);
      const policyOutcome = enforceHybridPolicy(
        caseRecord,
        proposal,
        toolObservations,
        null,
        verifiedToolsRun?.prediction ?? null,
      );
      modelProposal = policyOutcome.model_proposal;
      policyDecision = policyOutcome.policy_decision;
      evidenceBundle = policyOutcome.evidence_bundle;
      finalOutput = policyOutcome.final_output;
      if (detectUnsupportedClaims(finalOutput.response_draft).length > 0) {
        safetyViolations.push(...detectUnsupportedClaims(finalOutput.response_draft));
      }
      turns.push({
        turn_index: turnIndex,
        response_id: response.response_id,
        model: response.model,
        output_text: response.output_text,
        tool_calls: response.tool_calls,
        validation: [{ kind: "structured_output_validation", passed: true, detail: "Validated structured output" }],
        usage: response.usage,
        latency_ms: response.latency_ms,
        retries: response.retries,
      });
      previousResponseId = response.response_id;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      validationFailures.push(message);
      turnValidation.push({ kind: "structured_output_validation", passed: false, detail: message });
      turns.push({
        turn_index: turnIndex,
        response_id: response.response_id,
        model: response.model,
        output_text: response.output_text,
        tool_calls: response.tool_calls,
        validation: turnValidation,
        usage: response.usage,
        latency_ms: response.latency_ms,
        retries: response.retries,
      });
      if (validationFailures.length === 1) {
        const repairRequest: AgentGenerationRequest = {
          ...request,
          turnIndex: turnIndex + 1,
          previousResponseId,
          repairErrors: validationFailures.slice(-3),
          toolDefinitions: [],
        };
        const repairResponse = await provider.generate(repairRequest);
        totalRetries += repairResponse.retries;
        try {
          const parsed = parseStructuredOutput(repairResponse.output_text ?? "");
          const proposal = parseModelProposal(parsed, caseRecord, toolObservations);
          const policyOutcome = enforceHybridPolicy(
            caseRecord,
            proposal,
            toolObservations,
            null,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = policyOutcome.model_proposal;
          policyDecision = policyOutcome.policy_decision;
          evidenceBundle = policyOutcome.evidence_bundle;
          finalOutput = policyOutcome.final_output;
          turns.push({
            turn_index: turnIndex + 1,
            response_id: repairResponse.response_id,
            model: repairResponse.model,
            output_text: repairResponse.output_text,
            tool_calls: repairResponse.tool_calls,
            validation: [
              { kind: "repair_attempt", passed: true, detail: "Repair attempt succeeded" },
              { kind: "structured_output_validation", passed: true, detail: "Validated repaired output" },
            ],
            usage: repairResponse.usage,
            latency_ms: repairResponse.latency_ms,
            retries: repairResponse.retries,
          });
          previousResponseId = repairResponse.response_id;
          responseId = repairResponse.response_id;
          break;
        } catch (repairError) {
          const repairMessage = repairError instanceof Error ? repairError.message : String(repairError);
          validationFailures.push(repairMessage);
          turns.push({
            turn_index: turnIndex + 1,
            response_id: repairResponse.response_id,
            model: repairResponse.model,
            output_text: repairResponse.output_text,
            tool_calls: repairResponse.tool_calls,
            validation: [
              { kind: "repair_attempt", passed: true, detail: "Repair attempted" },
              { kind: "structured_output_validation", passed: false, detail: repairMessage },
            ],
            usage: repairResponse.usage,
            latency_ms: repairResponse.latency_ms,
            retries: repairResponse.retries,
          });
          const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
          const fallbackOutcome = enforceHybridPolicy(
            caseRecord,
            fallbackProposal,
            toolObservations,
            repairMessage,
            verifiedToolsRun?.prediction ?? null,
          );
          modelProposal = fallbackOutcome.model_proposal;
          policyDecision = fallbackOutcome.policy_decision;
          evidenceBundle = fallbackOutcome.evidence_bundle;
          finalOutput = fallbackOutcome.final_output;
          break;
        }
      }
    }
  }

  if (!finalOutput) {
    const fallbackProposal = inferPolicyFromConversation(caseRecord, toolObservations);
    const fallbackOutcome = enforceHybridPolicy(
      caseRecord,
      fallbackProposal,
      toolObservations,
      "model turn limit reached",
      verifiedToolsRun?.prediction ?? null,
    );
    modelProposal = fallbackOutcome.model_proposal;
    policyDecision = fallbackOutcome.policy_decision;
    evidenceBundle = fallbackOutcome.evidence_bundle;
    finalOutput = fallbackOutcome.final_output;
    validationFailures.push("Model turn limit reached");
  }

  const normalized = finalOutput;
  const runtimeMs = Math.round(performance.now() - startedAt);
  const apiUsage = turns.reduce<AgentModelUsage | null>((acc, turn) => {
    if (!turn.usage) {
      return acc;
    }
    const input = (acc?.input_tokens ?? 0) + (turn.usage.input_tokens ?? 0);
    const cached = (acc?.cached_input_tokens ?? 0) + (turn.usage.cached_input_tokens ?? 0);
    const output = (acc?.output_tokens ?? 0) + (turn.usage.output_tokens ?? 0);
    const reasoning = (acc?.reasoning_tokens ?? 0) + (turn.usage.reasoning_tokens ?? 0);
    const total = (acc?.total_tokens ?? 0) + (turn.usage.total_tokens ?? 0);
    return {
      input_tokens: input,
      cached_input_tokens: cached,
      output_tokens: output,
      reasoning_tokens: reasoning,
      total_tokens: total,
    };
  }, null);
  const apiCostUsd = estimateUsageCostUsd(apiUsage, options.model);
  const result = {
    case_id: options.caseId,
    prompt_version: options.promptVersion,
    model: options.model,
    reasoning_effort: options.reasoningEffort,
    execution_mode: executionMode,
    verified_tools_prediction:
      verifiedToolsRun?.prediction ?? normalized.prediction,
    model_proposal: modelProposal ?? inferPolicyFromConversation(caseRecord, toolObservations),
    evidence_bundle: evidenceBundle ?? {
      evidence_refs: normalized.evidence_refs,
      tool_names: [],
      product_refs: [],
      inventory_refs: [],
      delivery_refs: [],
      business_refs: [],
      policy_refs: [],
    },
    policy_decision: policyDecision ?? {
      approval_required: true,
      approval_queue: normalized.approval_queue,
      escalation_required: normalized.escalation_required,
      escalation_reason: normalized.escalation_reason,
      lead_decision: normalized.lead_decision,
      provisional_order_decision: normalized.provisional_order_decision,
      product_association: normalized.product_association,
      response_draft: normalized.response_draft,
      confidence: normalized.confidence,
      claim_validation: [],
      overrides: [],
      prediction: normalized.prediction,
    },
    policy_overrides: policyDecision?.overrides ?? [],
    claim_validation: policyDecision?.claim_validation ?? [],
    final_output: normalized,
    prediction: normalized.prediction,
    turns,
    tool_events: toolEvents,
    tool_observations: toolObservations,
    validation_failures: validationFailures,
    safety_violations: safetyViolations,
    api_usage: apiUsage,
    usage: apiUsage,
    api_cost_usd: apiCostUsd,
    total_model_turns: turns.length,
    total_tool_calls: totalToolCalls,
    retries: totalRetries,
    runtime_ms: runtimeMs,
    response_id: responseId,
    trace_markdown: "",
    approval_required: true as const,
    approval_queue: normalized.approval_queue,
    escalation_required: normalized.escalation_required,
    escalation_reason: normalized.escalation_reason,
    prompt_instructions: promptInstructions,
  };
  return result;
}
