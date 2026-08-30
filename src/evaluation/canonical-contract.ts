export const CANONICAL_APPROVAL_QUEUES = ["normal", "specialized"] as const;
export const CANONICAL_LEAD_DECISIONS = ["create_lead", "do_not_create_lead"] as const;
export const CANONICAL_PROVISIONAL_ORDER_DECISIONS = [
  "prepare_provisional_order",
  "do_not_prepare_provisional_order",
] as const;
export const CANONICAL_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export const CANONICAL_PRODUCT_ASSOCIATION_STATUSES = ["associated", "clarification_needed"] as const;

export const CANONICAL_INTENT_LABELS = [
  "ambiguous_product_reference",
  "availability_question",
  "bulk_order",
  "business_location_question",
  "complaint",
  "compliment_only",
  "confirmed_order_intent",
  "delivery_constraint",
  "delivery_question",
  "duplicate_inquiry",
  "human_handoff",
  "inventory_constraint",
  "multi_message_memory",
  "negotiation",
  "negotiation_within_policy",
  "order_intent",
  "phone_call_request",
  "policy_dependent_discount",
  "price_match_request",
  "price_offer_below_minimum",
  "pricing_request",
  "product_image_request",
  "prompt_injection",
  "quantity_request",
  "refund_request",
  "spam_or_unrelated",
  "unavailable_stock_request",
  "unsupported_price_claim",
  "variant_request",
] as const;

export const CANONICAL_ACTIONS = [
  "apply_allowed_discount_or_confirm_verified_price",
  "apply_bulk_policy_and_escalate_payment_terms",
  "ask_for_clarifying_product_details",
  "capture_provisional_order_details",
  "decline_below_minimum_price",
  "deduplicate_and_link_existing_thread",
  "escalate_complaint_for_human_review",
  "explain_unavailable_stock_and_offer_waitlist",
  "ignore_or_flag_as_spam",
  "negotiate_with_inventory_and_delivery_constraints",
  "provide_verified_business_location",
  "reject_and_escalate_security_issue",
  "reply_with_verified_price",
  "respond_with_verified_price_and_refuse_unsupported_claim",
  "route_to_human_for_call_back",
  "share_verified_product_image",
  "thank_without_lead_creation",
  "use_prior_context_to_confirm_order_details",
  "verify_delivery_terms_before_replying",
  "verify_stock_before_replying",
] as const;

export const CANONICAL_ORDER_FIELDS = [
  "delivery_city",
  "delivery_date",
  "discount_request",
  "invoice_request",
  "partial_fulfillment",
  "payment_terms",
  "payment_timing",
  "quantity",
  "variant",
] as const;

export type ApprovalQueue = (typeof CANONICAL_APPROVAL_QUEUES)[number];
export type LeadDecision = (typeof CANONICAL_LEAD_DECISIONS)[number];
export type ProvisionalOrderDecision = (typeof CANONICAL_PROVISIONAL_ORDER_DECISIONS)[number];
export type ConfidenceCategory = (typeof CANONICAL_CONFIDENCE_LEVELS)[number];
export type ProductAssociationStatus = (typeof CANONICAL_PRODUCT_ASSOCIATION_STATUSES)[number];
export type IntentLabel = (typeof CANONICAL_INTENT_LABELS)[number];
export type ActionLabel = (typeof CANONICAL_ACTIONS)[number];
export type OrderField = (typeof CANONICAL_ORDER_FIELDS)[number];

export const CANONICAL_CONTRACT = {
  approval_queues: CANONICAL_APPROVAL_QUEUES,
  lead_decisions: CANONICAL_LEAD_DECISIONS,
  provisional_order_decisions: CANONICAL_PROVISIONAL_ORDER_DECISIONS,
  confidence_levels: CANONICAL_CONFIDENCE_LEVELS,
  product_association_statuses: CANONICAL_PRODUCT_ASSOCIATION_STATUSES,
  intent_labels: CANONICAL_INTENT_LABELS,
  actions: CANONICAL_ACTIONS,
  order_fields: CANONICAL_ORDER_FIELDS,
} as const;

