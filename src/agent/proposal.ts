import type {
  ConfidenceCategory,
  IntentLabel,
} from "../evaluation/canonical-contract.js";

export const MODEL_PROPOSAL_VERSION = "sales-agent-proposal-v1";

export type ProposalEntityType =
  | "customer_name"
  | "username"
  | "product_reference"
  | "variant"
  | "quantity"
  | "price"
  | "discount"
  | "delivery_destination"
  | "requested_date"
  | "contact_preference"
  | "phone_call_request"
  | "order_intent"
  | "payment_timing";

export interface ProposalEntity {
  entity_type: ProposalEntityType;
  normalized_value: string;
  source_text: string;
  source_message_ref: string;
  confidence: ConfidenceCategory;
  inferred: boolean;
}

export interface ProposalProductReferenceCandidate {
  normalized_value: string;
  source_text: string;
  source_message_ref: string;
  confidence: ConfidenceCategory;
  inferred: boolean;
}

export interface ProposalToolRequest {
  tool_name: string;
  arguments: Record<string, unknown>;
  reason: string;
  confidence: ConfidenceCategory;
}

export interface ModelProposal {
  proposal_version: string;
  language: string;
  normalized_customer_meaning: string;
  canonical_intent_candidates: IntentLabel[];
  explicitly_stated_entities: ProposalEntity[];
  product_reference_candidates: ProposalProductReferenceCandidate[];
  ambiguity: string[];
  clarification_question: string | null;
  requested_tools: ProposalToolRequest[];
  response_style: string;
  draft_suggestion: string;
  confidence: ConfidenceCategory;
  reasoning_summary: string;
}
