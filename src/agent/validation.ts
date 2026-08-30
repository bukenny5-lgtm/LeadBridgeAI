import type { AgentFinalOutput, AgentToolCall } from "./types.js";
import { CONTROLLED_TOOLS } from "./tool-catalog.js";
import {
  MODEL_PROPOSAL_VERSION,
  type ModelProposal,
  type ProposalEntity,
  type ProposalToolRequest,
} from "./proposal.js";
import {
  CANONICAL_ACTIONS,
  CANONICAL_APPROVAL_QUEUES,
  CANONICAL_CONFIDENCE_LEVELS,
  CANONICAL_INTENT_LABELS,
  CANONICAL_LEAD_DECISIONS,
  CANONICAL_ORDER_FIELDS,
  CANONICAL_PRODUCT_ASSOCIATION_STATUSES,
  CANONICAL_PROVISIONAL_ORDER_DECISIONS,
} from "../evaluation/canonical-contract.js";

export const AGENT_MODEL_PROPOSAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "proposal_version",
    "language",
    "normalized_customer_meaning",
    "canonical_intent_candidates",
    "explicitly_stated_entities",
    "product_reference_candidates",
    "ambiguity",
    "clarification_question",
    "requested_tools",
    "response_style",
    "draft_suggestion",
    "confidence",
    "reasoning_summary",
  ],
  properties: {
    proposal_version: { type: "string" },
    language: { type: "string", minLength: 1 },
    normalized_customer_meaning: { type: "string", minLength: 1 },
    canonical_intent_candidates: { type: "array", items: { type: "string", enum: [...CANONICAL_INTENT_LABELS] } },
    explicitly_stated_entities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "entity_type",
          "normalized_value",
          "source_text",
          "source_message_ref",
          "confidence",
          "inferred",
        ],
        properties: {
          entity_type: { type: "string", minLength: 1 },
          normalized_value: { type: "string", minLength: 1 },
          source_text: { type: "string", minLength: 1 },
          source_message_ref: { type: "string", minLength: 1 },
          confidence: { type: "string", enum: [...CANONICAL_CONFIDENCE_LEVELS] },
          inferred: { type: "boolean" },
        },
      },
    },
    product_reference_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["normalized_value", "source_text", "source_message_ref", "confidence", "inferred"],
        properties: {
          normalized_value: { type: "string", minLength: 1 },
          source_text: { type: "string", minLength: 1 },
          source_message_ref: { type: "string", minLength: 1 },
          confidence: { type: "string", enum: [...CANONICAL_CONFIDENCE_LEVELS] },
          inferred: { type: "boolean" },
        },
      },
    },
    ambiguity: { type: "array", items: { type: "string", minLength: 1 } },
    clarification_question: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    requested_tools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tool_name", "arguments", "reason", "confidence"],
        properties: {
          tool_name: {
            type: "string",
            enum: CONTROLLED_TOOLS.map((tool) => tool.definition.name),
          },
          arguments: { type: "object" },
          reason: { type: "string", minLength: 1 },
          confidence: { type: "string", enum: [...CANONICAL_CONFIDENCE_LEVELS] },
        },
      },
    },
    response_style: { type: "string", minLength: 1 },
    draft_suggestion: { type: "string", minLength: 1 },
    confidence: { type: "string", enum: [...CANONICAL_CONFIDENCE_LEVELS] },
    reasoning_summary: { type: "string", minLength: 1 },
  },
} as const;

export const AGENT_FINAL_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "response_draft",
    "approval_required",
    "approval_queue",
    "escalation_required",
    "escalation_reason",
    "evidence_refs",
    "confidence",
    "lead_decision",
    "provisional_order_decision",
    "extracted_order_fields",
    "missing_order_fields",
    "intents",
    "product_association",
    "prediction",
  ],
  properties: {
    response_draft: { type: "string" },
    approval_required: { type: "boolean", const: true },
    approval_queue: { type: "string", enum: [...CANONICAL_APPROVAL_QUEUES] },
    escalation_required: { type: "boolean" },
    escalation_reason: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    evidence_refs: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: [...CANONICAL_CONFIDENCE_LEVELS] },
    lead_decision: { type: "string", enum: [...CANONICAL_LEAD_DECISIONS] },
    provisional_order_decision: {
      type: "string",
      enum: [...CANONICAL_PROVISIONAL_ORDER_DECISIONS],
    },
    extracted_order_fields: {
      anyOf: [{ type: "array", items: { type: "string", enum: [...CANONICAL_ORDER_FIELDS] } }, { type: "null" }],
    },
    missing_order_fields: {
      anyOf: [{ type: "array", items: { type: "string", enum: [...CANONICAL_ORDER_FIELDS] } }, { type: "null" }],
    },
    intents: { type: "array", items: { type: "string", enum: [...CANONICAL_INTENT_LABELS] } },
    product_association: {
      type: "object",
      additionalProperties: false,
      required: ["status", "product_id", "clarification_question"],
      properties: {
        status: { type: "string", enum: [...CANONICAL_PRODUCT_ASSOCIATION_STATUSES] },
        product_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        clarification_question: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
    prediction: {
      type: "object",
      additionalProperties: false,
      required: [
        "response_text",
        "is_lead",
        "intent_labels",
        "product_id",
        "action",
        "escalation",
        "lead_creation",
        "provisional_order",
        "order_fields",
      ],
      properties: {
        response_text: { type: "string" },
        is_lead: { type: "boolean" },
        intent_labels: { type: "array", items: { type: "string", enum: [...CANONICAL_INTENT_LABELS] } },
        product_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        action: { type: "string", enum: [...CANONICAL_ACTIONS] },
        escalation: { type: "boolean" },
        lead_creation: { type: "boolean" },
        provisional_order: { type: "boolean" },
        order_fields: { anyOf: [{ type: "array", items: { type: "string", enum: [...CANONICAL_ORDER_FIELDS] } }, { type: "null" }] },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

function readNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  return readString(value, field);
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${field} to be a boolean`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${field} to be an array`);
  }
  return value.map((entry, index) => readString(entry, `${field}[${index}]`));
}

function readEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const stringValue = readString(value, field);
  if (!allowed.includes(stringValue as T)) {
    throw new Error(`Expected ${field} to be one of ${allowed.join(", ")}`);
  }
  return stringValue as T;
}

function readNullableEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | null {
  if (value === null) {
    return null;
  }
  return readEnum(value, field, allowed);
}

function readEnumArray<T extends string>(value: unknown, field: string, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${field} to be an array`);
  }
  const result = value.map((entry, index) => readEnum(entry, `${field}[${index}]`, allowed));
  if (new Set(result).size !== result.length) {
    throw new Error(`Expected ${field} to not contain duplicate values`);
  }
  return result;
}

function readNullableEnumArray<T extends string>(value: unknown, field: string, allowed: readonly T[]): T[] | null {
  if (value === null) {
    return null;
  }
  return readEnumArray(value, field, allowed);
}

function readProposalEntity(value: unknown, field: string): ProposalEntity {
  if (!isRecord(value)) {
    throw new Error(`Expected ${field} to be an object`);
  }
  return {
    entity_type: readString(value.entity_type, `${field}.entity_type`) as ProposalEntity["entity_type"],
    normalized_value: readString(value.normalized_value, `${field}.normalized_value`),
    source_text: readString(value.source_text, `${field}.source_text`),
    source_message_ref: readString(value.source_message_ref, `${field}.source_message_ref`),
    confidence: readEnum(value.confidence, `${field}.confidence`, CANONICAL_CONFIDENCE_LEVELS),
    inferred: readBoolean(value.inferred, `${field}.inferred`),
  };
}

function readProposalProductReferenceCandidate(
  value: unknown,
  field: string,
): ModelProposal["product_reference_candidates"][number] {
  if (!isRecord(value)) {
    throw new Error(`Expected ${field} to be an object`);
  }
  return {
    normalized_value: readString(value.normalized_value, `${field}.normalized_value`),
    source_text: readString(value.source_text, `${field}.source_text`),
    source_message_ref: readString(value.source_message_ref, `${field}.source_message_ref`),
    confidence: readEnum(value.confidence, `${field}.confidence`, CANONICAL_CONFIDENCE_LEVELS),
    inferred: readBoolean(value.inferred, `${field}.inferred`),
  };
}

function readProposalToolRequest(value: unknown, field: string): ProposalToolRequest {
  if (!isRecord(value)) {
    throw new Error(`Expected ${field} to be an object`);
  }
  const allowedTools = CONTROLLED_TOOLS.map((tool) => tool.definition.name);
  const argumentsValue = value.arguments;
  if (!isRecord(argumentsValue)) {
    throw new Error(`Expected ${field}.arguments to be an object`);
  }
  return {
    tool_name: readEnum(value.tool_name, `${field}.tool_name`, allowedTools),
    arguments: argumentsValue,
    reason: readString(value.reason, `${field}.reason`),
    confidence: readEnum(value.confidence, `${field}.confidence`, CANONICAL_CONFIDENCE_LEVELS),
  };
}

function readProposalEntityArray(value: unknown, field: string): ProposalEntity[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${field} to be an array`);
  }
  return value.map((entry, index) => readProposalEntity(entry, `${field}[${index}]`));
}

function readProposalToolRequestArray(value: unknown, field: string): ProposalToolRequest[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${field} to be an array`);
  }
  const requests = value.map((entry, index) => readProposalToolRequest(entry, `${field}[${index}]`));
  const fingerprints = new Set(requests.map((request) => `${request.tool_name}:${JSON.stringify(request.arguments)}`));
  if (fingerprints.size !== requests.length) {
    throw new Error(`Expected ${field} to not contain duplicate tool requests`);
  }
  return requests;
}

function readStringArrayUnique(value: unknown, field: string): string[] {
  const items = readStringArray(value, field);
  if (new Set(items).size !== items.length) {
    throw new Error(`Expected ${field} to not contain duplicate values`);
  }
  return items;
}

export function validateModelProposal(value: unknown): ModelProposal {
  if (!isRecord(value)) {
    throw new Error("Expected model proposal to be an object");
  }
  const proposal = {
    proposal_version: readString(value.proposal_version, "proposal_version"),
    language: readString(value.language, "language"),
    normalized_customer_meaning: readString(value.normalized_customer_meaning, "normalized_customer_meaning"),
    canonical_intent_candidates: readEnumArray(
      value.canonical_intent_candidates,
      "canonical_intent_candidates",
      CANONICAL_INTENT_LABELS,
    ),
    explicitly_stated_entities: readProposalEntityArray(value.explicitly_stated_entities, "explicitly_stated_entities"),
    product_reference_candidates: Array.isArray(value.product_reference_candidates)
      ? value.product_reference_candidates.map((entry, index) =>
          readProposalProductReferenceCandidate(entry, `product_reference_candidates[${index}]`),
        )
      : (() => {
          throw new Error("Expected product_reference_candidates to be an array");
        })(),
    ambiguity: readStringArrayUnique(value.ambiguity, "ambiguity"),
    clarification_question: readNullableString(value.clarification_question, "clarification_question"),
    requested_tools: readProposalToolRequestArray(value.requested_tools, "requested_tools"),
    response_style: readString(value.response_style, "response_style"),
    draft_suggestion: readString(value.draft_suggestion, "draft_suggestion"),
    confidence: readEnum(value.confidence, "confidence", CANONICAL_CONFIDENCE_LEVELS),
    reasoning_summary: readString(value.reasoning_summary, "reasoning_summary"),
  } satisfies ModelProposal;

  if (proposal.proposal_version !== MODEL_PROPOSAL_VERSION) {
    throw new Error(`Expected proposal_version to be ${MODEL_PROPOSAL_VERSION}`);
  }
  if (proposal.canonical_intent_candidates.length === 0) {
    throw new Error("canonical_intent_candidates must not be empty");
  }
  if (proposal.product_reference_candidates.length > 0) {
    const seen = new Set(proposal.product_reference_candidates.map((candidate) => `${candidate.normalized_value}:${candidate.source_message_ref}`));
    if (seen.size !== proposal.product_reference_candidates.length) {
      throw new Error("product_reference_candidates must not contain duplicate values");
    }
  }
  const toolFingerprints = new Set(proposal.requested_tools.map((request) => `${request.tool_name}:${JSON.stringify(request.arguments)}`));
  if (toolFingerprints.size !== proposal.requested_tools.length) {
    throw new Error("requested_tools must not contain duplicate tool requests");
  }
  return proposal;
}

export function validateToolCall(name: string, argumentsValue: unknown): AgentToolCall {
  if (!isRecord(argumentsValue)) {
    throw new Error(`Tool ${name} arguments must be an object`);
  }
  return {
    call_id: `${name}-validated`,
    name,
    arguments: argumentsValue,
  };
}

export interface AgentValidationContext {
  availableEvidenceRefs: string[];
  mode?: "proposal" | "final";
}

function collectRefSet(values: string[]): Set<string> {
  return new Set(values);
}

function hasRefWithPrefix(refs: Set<string>, prefix: string): boolean {
  for (const ref of refs) {
    if (ref.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function validateCrossFieldConstraints(
  output: AgentFinalOutput,
  context: AgentValidationContext,
): void {
  if ((context.mode ?? "final") === "proposal") {
    return;
  }
  if (output.approval_required !== true) {
    throw new Error("approval_required must be true");
  }
  if (output.approval_queue === "normal" && output.escalation_required) {
    throw new Error("normal approval queue cannot require escalation");
  }
  if (output.approval_queue === "specialized") {
    if (!output.escalation_required) {
      throw new Error("specialized approval queue requires escalation_required=true");
    }
    if (!output.escalation_reason) {
      throw new Error("specialized approval queue requires an escalation reason");
    }
  }
  if (!output.escalation_required && output.approval_queue !== "normal") {
    throw new Error("escalation_required=false requires the normal approval queue");
  }
  if (output.provisional_order_decision === "do_not_prepare_provisional_order") {
    if (output.extracted_order_fields !== null) {
      throw new Error("extracted_order_fields must be null when provisional order creation is false");
    }
    if (output.missing_order_fields !== null) {
      throw new Error("missing_order_fields must be null when provisional order creation is false");
    }
    if (output.prediction.order_fields !== null) {
      throw new Error("order_fields must be null when provisional order creation is false");
    }
  } else {
    if (!output.extracted_order_fields) {
      throw new Error("provisional order creation requires extracted_order_fields");
    }
    if (output.prediction.order_fields === null) {
      throw new Error("provisional order creation requires order_fields");
    }
    const extracted = new Set(output.extracted_order_fields);
    for (const field of output.prediction.order_fields ?? []) {
      if (!extracted.has(field)) {
        throw new Error("order_fields may contain only explicitly extracted facts");
      }
    }
    if (output.missing_order_fields) {
      for (const field of output.missing_order_fields) {
        if (extracted.has(field)) {
          throw new Error("missing_order_fields must not overlap with extracted_order_fields");
        }
      }
    }
  }

  const availableRefs = collectRefSet(context.availableEvidenceRefs);
  const citedRefs = collectRefSet(output.evidence_refs);
  for (const ref of citedRefs) {
    if (!availableRefs.has(ref)) {
      throw new Error(`evidence ref not present in trajectory: ${ref}`);
    }
  }

  if (context.mode !== "proposal") {
    const text = `${output.response_draft} ${output.prediction.response_text}`.toLowerCase();
    if (/(stock|in stock|available|availability|units|left)/.test(text) && !hasRefWithPrefix(citedRefs, "product:")) {
      throw new Error("stock claims require inventory evidence");
    }
    if (/(delivery|deliver|shipping|courier|fee|window|arrival)/.test(text) && !hasRefWithPrefix(citedRefs, "delivery:")) {
      throw new Error("delivery claims require delivery evidence");
    }
    if (/(price|cost|ugx|shs|\/=|discount)/.test(text) && !hasRefWithPrefix(citedRefs, "policy:")) {
      throw new Error("price claims require product-price evidence");
    }
  }

  if (output.product_association.status === "associated") {
    if (!output.product_association.product_id) {
      throw new Error("associated product state requires a product_id");
    }
    if (
      !hasRefWithPrefix(citedRefs, "post:") &&
      !hasRefWithPrefix(citedRefs, "product:") &&
      !hasRefWithPrefix(citedRefs, "catalogue:")
    ) {
      throw new Error("product association requires post mapping, catalogue match, or verified product evidence");
    }
  }

  if (
    output.prediction.product_id === null &&
    ![
      "provide_verified_business_location",
      "ignore_or_flag_as_spam",
      "reject_and_escalate_security_issue",
      "thank_without_lead_creation",
      "respond_with_clarifying_question",
      "ask_for_clarifying_product_details",
      "route_to_human_for_call_back",
      "escalate_complaint_for_human_review",
    ].includes(output.prediction.action)
  ) {
    throw new Error("product_id may be null only for responses that do not need product association");
  }
}

export function validateAgentFinalOutput(value: unknown, context: AgentValidationContext = { availableEvidenceRefs: [] }): AgentFinalOutput {
  if (!isRecord(value)) {
    throw new Error("Expected final output to be an object");
  }
  const prediction = value.prediction;
  if (!isRecord(prediction)) {
    throw new Error("Expected prediction to be an object");
  }
  const productAssociation = value.product_association;
  if (!isRecord(productAssociation)) {
    throw new Error("Expected product_association to be an object");
  }
  if (value.approval_required !== true) {
    throw new Error("Expected approval_required to be true");
  }
  const output: AgentFinalOutput = {
    response_draft: readString(value.response_draft, "response_draft"),
    approval_required: true,
    approval_queue: readEnum(value.approval_queue, "approval_queue", CANONICAL_APPROVAL_QUEUES),
    escalation_required: readBoolean(value.escalation_required, "escalation_required"),
    escalation_reason: readNullableString(value.escalation_reason, "escalation_reason"),
    evidence_refs: readStringArray(value.evidence_refs, "evidence_refs"),
    confidence: readEnum(value.confidence, "confidence", CANONICAL_CONFIDENCE_LEVELS),
    lead_decision: readEnum(value.lead_decision, "lead_decision", CANONICAL_LEAD_DECISIONS),
    provisional_order_decision: readEnum(
      value.provisional_order_decision,
      "provisional_order_decision",
      CANONICAL_PROVISIONAL_ORDER_DECISIONS,
    ),
    extracted_order_fields: readNullableEnumArray(value.extracted_order_fields, "extracted_order_fields", CANONICAL_ORDER_FIELDS),
    missing_order_fields: readNullableEnumArray(value.missing_order_fields, "missing_order_fields", CANONICAL_ORDER_FIELDS),
    intents: readEnumArray(value.intents, "intents", CANONICAL_INTENT_LABELS),
    product_association: {
      status: readEnum(
        productAssociation.status,
        "product_association.status",
        CANONICAL_PRODUCT_ASSOCIATION_STATUSES,
      ),
      product_id: readNullableString(productAssociation.product_id, "product_association.product_id"),
      clarification_question: readNullableString(
        productAssociation.clarification_question,
        "product_association.clarification_question",
      ),
    },
    prediction: {
      response_text: readString(prediction.response_text, "prediction.response_text"),
      is_lead: readBoolean(prediction.is_lead, "prediction.is_lead"),
      intent_labels: readEnumArray(prediction.intent_labels, "prediction.intent_labels", CANONICAL_INTENT_LABELS),
      product_id: readNullableString(prediction.product_id, "prediction.product_id"),
      action: readEnum(prediction.action, "prediction.action", CANONICAL_ACTIONS),
      escalation: readBoolean(prediction.escalation, "prediction.escalation"),
      lead_creation: readBoolean(prediction.lead_creation, "prediction.lead_creation"),
      provisional_order: readBoolean(prediction.provisional_order, "prediction.provisional_order"),
      order_fields: readNullableEnumArray(prediction.order_fields, "prediction.order_fields", CANONICAL_ORDER_FIELDS),
    },
  };
  validateCrossFieldConstraints(output, context);
  return output;
}
