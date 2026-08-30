import type { Prediction, RunnableEvaluationCase } from "../evaluation/case-schema.js";
import type {
  ActionLabel,
  ApprovalQueue,
  ConfidenceCategory,
  IntentLabel,
  LeadDecision,
  OrderField,
  ProvisionalOrderDecision,
} from "../evaluation/canonical-contract.js";
import { CANONICAL_INTENT_LABELS } from "../evaluation/canonical-contract.js";
import type {
  AgentFinalOutput,
  AgentToolObservation,
  ProductAssociationDecision,
} from "./types.js";
import {
  MODEL_PROPOSAL_VERSION,
  type ModelProposal,
  type ProposalEntity,
  type ProposalProductReferenceCandidate,
  type ProposalToolRequest,
} from "./proposal.js";
export type { ModelProposal } from "./proposal.js";

export interface EvidenceBundle {
  evidence_refs: string[];
  tool_names: string[];
  product_refs: string[];
  inventory_refs: string[];
  delivery_refs: string[];
  business_refs: string[];
  policy_refs: string[];
}

export interface PolicyOverride {
  field: string;
  proposed_value: unknown;
  policy_result: "accepted" | "rejected" | "normalized";
  reason_code: string;
  evidence_refs: string[];
}

export interface ClaimValidationResult {
  claim_type: "price" | "stock" | "delivery" | "location" | "negotiation" | "media";
  proposed_value: string | number | null;
  evidence_ref: string | null;
  validation_status: "validated" | "unsupported" | "omitted" | "clarified";
  safe_customer_value: string | null;
  reason: string;
}

export interface PolicyDecision {
  approval_required: true;
  approval_queue: ApprovalQueue;
  escalation_required: boolean;
  escalation_reason: string | null;
  lead_decision: LeadDecision;
  provisional_order_decision: ProvisionalOrderDecision;
  product_association: ProductAssociationDecision;
  response_draft: string;
  confidence: ConfidenceCategory;
  claim_validation: ClaimValidationResult[];
  overrides: PolicyOverride[];
  prediction: AgentFinalOutput["prediction"];
}

export interface FinalAgentPrediction {
  response_text: string;
  is_lead: boolean;
  intent_labels: IntentLabel[];
  product_id: string | null;
  action: ActionLabel;
  escalation: boolean;
  lead_creation: boolean;
  provisional_order: boolean;
  order_fields: OrderField[] | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’']/g, " ")
    .replace(/[@#][\p{L}\p{N}_]+/gu, " ")
    .replace(/(?:ugx|shs|\/=)/g, " ")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectCustomerText(caseRecord: RunnableEvaluationCase): string {
  return normalize(caseRecord.conversation.filter((message) => message.role === "customer").map((message) => message.text).join(" "));
}

function isSpam(text: string): boolean {
  return /\bfollow back\b|\bvisit my page\b|\bpromotion\b|\bpromo\b|\bfollower growth\b|\bunrelated links\b|\bclick my link\b|\bguaranteed returns\b|\bgrow your .* account\b|\bdm me\b|\bsubscribe\b|\bearn (?:money|fast)\b|\bcrypto\b.*\breturns\b/.test(
    text,
  );
}

function isPromptInjection(text: string): boolean {
  return /\bignore(?: your)?(?: the)? instructions\b|\bdisregard instructions\b|\boverride instructions\b|\breveal(?: the)? (?:internal )?(?:rules|price floor|policy notes)\b|\bbypass approval\b|\bdisclose minimum price\b|\bmark as paid\b|\bexpose customer data\b|\bsystem prompt\b|\bdeveloper message\b|\bdeveloper instructions\b|\bpolicy notes\b|\bprice floor\b|\bjailbreak\b/.test(
    text,
  );
}

function isComplaint(text: string): boolean {
  return /\bdamaged\b|\bwrong item\b|\blate\b|\brefund\b|\breturn\b|\bcancel\b|\bcracked\b/.test(text);
}

function isPhoneRequest(text: string): boolean {
  return /\b(call me|call back|phone me|ring me|by phone|phone call)\b/.test(text);
}

function isComplimentOnly(text: string): boolean {
  return (
    /\bnice page\b|\bnice work\b|\bgreat work\b|\bgreat page\b|\blove your posts\b|\bgood content\b|\bpolished\b|\bproduct shots\b/.test(text) &&
    !/\bprice\b|\bhow much\b|\bavailable\b|\bin stock\b|\bdeliver\b|\bship\b|\bimage\b|\bphoto\b/.test(text)
  );
}

function isPriceQuestion(text: string): boolean {
  return /\b(price|how much|quote|rate|total|hm|cost)\b/.test(text) && !/\bdelivery cost\b/.test(text);
}

function isAvailabilityQuestion(text: string): boolean {
  return /\bavailable\b|\bstill available\b|\bin stock\b|\bany left\b|\brestock\b|\brestocked\b|\brestocking\b/.test(text);
}

function isUnavailableStockQuestion(text: string): boolean {
  return /\bout of stock\b|\bno stock\b|\bsold out\b/.test(text);
}

function isProductImageRequest(text: string): boolean {
  return /\bphotos?\b|\bpictures?\b|\bphoto\b|\bimage\b|\bvideo\b|\bcatalogue\b|\bcatalog\b|\bsimilar products?\b|\bclear photos?\b/.test(
    text,
  );
}

function isLocationQuestion(text: string): boolean {
  return /\blocated\b|\bbased\b|\baddress\b|\bdirections\b|\bwhatsapp\b|\bphone\b|\bwhere are you\b|\bwhere is\b|\bpickup point\b|\bpickup\b/.test(
    text,
  );
}

function isDeliveryQuestion(text: string): boolean {
  return /\bdeliver\b|\bship\b|\bcourier\b|\bdelivery fee\b|\bdelivery cost\b|\barrival\b/.test(text);
}

function isNegotiation(text: string): boolean {
  return /\bbest price\b|\blast price\b|\bdiscount\b|\breduce\b|\bbudget\b|\bbulk\b|\bwholesale\b|\bcan you do\b|\bdealer pricing\b|\b\d{1,2}\s*(?:%|percent)?\s*off\b|\btoo low\b|\bonly pay\b/.test(
    text,
  );
}

function isOrderIntent(text: string): boolean {
  return /\bi will pay today\b|\bcheckout details\b|\bsend the invoice\b|\bplace the order\b|\bsend invoice\b|\bcheckout\b|\bi want\b|\bi ll take it\b|\breserve\b|\bbook\b/.test(
    text,
  );
}

function isConfirmedOrder(text: string): boolean {
  return /\bi will pay today\b|\bcheckout details\b|\bsend the invoice\b|\bplace the order\b|\bsend invoice\b|\bcheckout\b/.test(
    text,
  );
}

function hasAgentMemory(caseRecord: RunnableEvaluationCase): boolean {
  return caseRecord.conversation.some((message) => message.role === "agent");
}

function extractQuantity(text: string): number | null {
  const numeric = text.match(/\b(\d{1,4})\b/);
  if (numeric) {
    return Number(numeric[1]);
  }
  const wordMatch = text.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/,
  );
  if (!wordMatch) {
    return null;
  }
  const map: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
  };
  return map[wordMatch[1]] ?? null;
}

function extractCurrencyNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, "");
  const ugx = cleaned.match(/\b(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)\s*(?:ugx|shs|\/=)\b/i);
  if (ugx) {
    return Number(ugx[1].replace(/\s+/g, ""));
  }
  const kMatch = cleaned.match(/\b(\d+(?:\.\d+)?)k\b/i);
  if (kMatch) {
    return Math.round(Number(kMatch[1]) * 1000);
  }
  return null;
}

function extractVariantHint(text: string): string | null {
  if (/\bred\b/.test(text)) return "red";
  if (/\bblue\b/.test(text)) return "blue";
  if (/\bgreen\b/.test(text)) return "green";
  if (/\bnavy\b/.test(text)) return "navy";
  if (/\bblack\b/.test(text)) return "black";
  if (/\bwhite\b/.test(text)) return "white";
  if (/\bsand\b/.test(text)) return "sand";
  if (/\bmixed\b/.test(text)) return "mixed";
  if (/\bcolour\b|\bcolor\b/.test(text)) return "colour";
  if (/\bsize\b/.test(text)) return "size";
  if (/\bpack size\b/.test(text)) return "pack size";
  if (/\bdesign\b/.test(text)) return "design";
  return null;
}

function extractDestination(text: string): string | null {
  if (/\bjinja\b/.test(text)) return "Jinja Town";
  if (/\bmukono\b/.test(text)) return "Mukono Town";
  if (/\bentebbe\b/.test(text)) return "Entebbe Town";
  if (/\bwakiso\b/.test(text)) return "Wakiso Town";
  if (/\bkampala\b/.test(text)) return "Kampala Central";
  return null;
}

function evidenceIndex(bundle: EvidenceBundle): Set<string> {
  return new Set(bundle.evidence_refs);
}

function buildEvidenceBundle(observations: AgentToolObservation[]): EvidenceBundle {
  const evidence_refs = new Set<string>();
  const tool_names = new Set<string>();
  const product_refs = new Set<string>();
  const inventory_refs = new Set<string>();
  const delivery_refs = new Set<string>();
  const business_refs = new Set<string>();
  const policy_refs = new Set<string>();

  for (const observation of observations) {
    tool_names.add(observation.tool_name);
    for (const ref of observation.evidence_refs) {
      evidence_refs.add(ref);
      if (ref.startsWith("product:")) {
        product_refs.add(ref);
      }
      if (ref.startsWith("inventory:")) {
        inventory_refs.add(ref);
      }
      if (ref.startsWith("delivery:")) {
        delivery_refs.add(ref);
      }
      if (ref.startsWith("business:")) {
        business_refs.add(ref);
      }
      if (ref.startsWith("policy:")) {
        policy_refs.add(ref);
      }
    }
    if (observation.tool_name === "checkInventory" && observation.outcome === "found") {
      inventory_refs.add(`inventory:${observation.call_id}`);
    }
    if (observation.tool_name === "getDeliveryOptions" && observation.outcome === "found") {
      delivery_refs.add(`delivery:${observation.call_id}`);
    }
    if (observation.tool_name === "getBusinessLocation" && observation.outcome === "found") {
      business_refs.add(`business:${observation.call_id}`);
    }
    if (observation.tool_name === "getNegotiationPolicy" && observation.outcome === "found") {
      policy_refs.add(`policy:${observation.call_id}`);
    }
  }

  return {
    evidence_refs: [...evidence_refs],
    tool_names: [...tool_names],
    product_refs: [...product_refs],
    inventory_refs: [...inventory_refs],
    delivery_refs: [...delivery_refs],
    business_refs: [...business_refs],
    policy_refs: [...policy_refs],
  };
}

function messageRef(index: number): string {
  return `message:${index}`;
}

function pushUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function collectIntentCandidates(caseRecord: RunnableEvaluationCase, text: string): IntentLabel[] {
  if (isPromptInjection(text)) {
    return ["prompt_injection"];
  }
  if (isSpam(text)) {
    return ["spam_or_unrelated"];
  }
  if (isComplaint(text)) {
    return ["complaint", "refund_request"];
  }
  if (isPhoneRequest(text)) {
    return ["phone_call_request", "human_handoff"];
  }
  if (isUnavailableStockQuestion(text)) {
    return ["unavailable_stock_request"];
  }

  const intents: IntentLabel[] = [];
  if (isProductImageRequest(text)) {
    pushUnique(intents, "product_image_request");
  }
  if (isAvailabilityQuestion(text)) {
    pushUnique(intents, "availability_question");
  }
  if (isDeliveryQuestion(text)) {
    pushUnique(intents, "delivery_question");
  }
  if (isLocationQuestion(text)) {
    pushUnique(intents, "business_location_question");
  }
  if (isNegotiation(text)) {
    if (text.includes("wholesale") || text.includes("bulk")) {
      pushUnique(intents, "bulk_order");
      pushUnique(intents, "policy_dependent_discount");
    } else {
      pushUnique(intents, "negotiation");
    }
  }
  if (isNegotiation(text) && /\bonly pay\b|\btoo low\b|\bbelow\b|\bminimum\b/.test(text)) {
    pushUnique(intents, "price_offer_below_minimum");
  }
  if (isPriceQuestion(text)) {
    pushUnique(intents, "pricing_request");
  }
  if (isOrderIntent(text)) {
    pushUnique(intents, hasAgentMemory(caseRecord) ? "multi_message_memory" : "confirmed_order_intent");
    pushUnique(intents, "order_intent");
  }
  if (isComplimentOnly(text)) {
    pushUnique(intents, "compliment_only");
  }
  if (/\bvariant\b|\bcolour\b|\bcolor\b|\bsize\b|\bmodel\b/.test(text)) {
    pushUnique(intents, "variant_request");
  }
  if (/\b\d{1,4}\b|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b/.test(text) && /\bneed\b|\bwant\b|\bbook\b|\breserve\b/.test(text)) {
    pushUnique(intents, "quantity_request");
  }
  if (/\bother seller\b|\banother seller\b|\bthey quoted\b|\bmatch it\b/.test(text)) {
    pushUnique(intents, "unsupported_price_claim");
    pushUnique(intents, "price_match_request");
  }
  if (/\bout of stock\b|\bno stock\b|\bsold out\b/.test(text)) {
    pushUnique(intents, "unavailable_stock_request");
  }

  return intents.length ? intents : ["ambiguous_product_reference"];
}

function inferAction(intents: IntentLabel[], text: string): ActionLabel {
  if (intents.includes("prompt_injection")) return "reject_and_escalate_security_issue";
  if (intents.includes("spam_or_unrelated")) return "ignore_or_flag_as_spam";
  if (intents.includes("complaint")) return "escalate_complaint_for_human_review";
  if (intents.includes("phone_call_request")) return "route_to_human_for_call_back";
  if (intents.includes("product_image_request")) return "share_verified_product_image";
  if (intents.includes("unavailable_stock_request")) return "explain_unavailable_stock_and_offer_waitlist";
  if (intents.includes("price_offer_below_minimum")) return "decline_below_minimum_price";
  if (intents.includes("availability_question")) return "verify_stock_before_replying";
  if (intents.includes("delivery_question")) return "verify_delivery_terms_before_replying";
  if (intents.includes("business_location_question")) return "provide_verified_business_location";
  if (intents.includes("bulk_order")) return "apply_bulk_policy_and_escalate_payment_terms";
  if (intents.includes("confirmed_order_intent") || intents.includes("order_intent")) return "capture_provisional_order_details";
  if (intents.includes("negotiation") && /delivery/.test(text)) return "negotiate_with_inventory_and_delivery_constraints";
  if (intents.includes("negotiation")) return "respond_with_verified_price_and_refuse_unsupported_claim";
  if (intents.includes("pricing_request")) return "reply_with_verified_price";
  if (intents.includes("compliment_only")) return "thank_without_lead_creation";
  return "ask_for_clarifying_product_details";
}

function inferLeadDecision(intents: IntentLabel[]): LeadDecision {
  if (
    intents.includes("spam_or_unrelated") ||
    intents.includes("prompt_injection") ||
    intents.includes("complaint") ||
    intents.includes("compliment_only")
  ) {
    return "do_not_create_lead";
  }
  return "create_lead";
}

function inferProvisionalOrderDecision(action: ActionLabel): ProvisionalOrderDecision {
  return [
    "capture_provisional_order_details",
    "use_prior_context_to_confirm_order_details",
    "apply_bulk_policy_and_escalate_payment_terms",
    "negotiate_with_inventory_and_delivery_constraints",
  ].includes(action)
    ? "prepare_provisional_order"
    : "do_not_prepare_provisional_order";
}

function inferConfidence(intents: IntentLabel[], productId: string | null, action: ActionLabel): ConfidenceCategory {
  if (intents.includes("ambiguous_product_reference")) return "low";
  if (!productId && action !== "ask_for_clarifying_product_details") return "low";
  if (intents.includes("bulk_order") || intents.includes("price_offer_below_minimum") || intents.includes("unsupported_price_claim")) {
    return "high";
  }
  if (productId) return "high";
  return "medium";
}

function deriveProductId(
  caseRecord: RunnableEvaluationCase,
  proposal: ModelProposal,
  bundle: EvidenceBundle,
): string | null {
  const conversation = collectCustomerText(caseRecord);
  if (bundle.product_refs.length === 1) {
    const ref = bundle.product_refs[0];
    return ref ? ref.replace(/^product:/, "").split("#")[0] : null;
  }
  if (caseRecord.post_id && bundle.product_refs.length > 0) {
    const ref = bundle.product_refs[0];
    return ref ? ref.replace(/^product:/, "").split("#")[0] : null;
  }
  const reference = proposal.product_reference_candidates.find((candidate) => /^UG-PRD-\d+$/i.test(candidate.normalized_value));
  if (reference) {
    return reference.normalized_value.toUpperCase();
  }
  if (conversation.includes("pickup") && !proposal.canonical_intent_candidates.includes("delivery_question") && !proposal.canonical_intent_candidates.includes("availability_question")) {
    return null;
  }
  return null;
}

function buildProductAssociation(
  text: string,
  proposal: ModelProposal,
  productId: string | null,
): ProductAssociationDecision {
  if (productId) {
    return {
      status: "associated",
      product_id: productId,
      clarification_question: null,
    };
  }
  if (proposal.clarification_question) {
    return {
      status: "clarification_needed",
      product_id: null,
      clarification_question: proposal.clarification_question,
    };
  }
  if (/\bprice\b|\bhow much\b|\bavailable\b|\bin stock\b|\bdeliver\b|\bimage\b|\bphoto\b/.test(text)) {
    return {
      status: "clarification_needed",
      product_id: null,
      clarification_question: "Could you share the product name or post link so I can verify the request?",
    };
  }
  return {
    status: "clarification_needed",
    product_id: null,
    clarification_question: null,
  };
}

function buildOrderFields(
  text: string,
  action: ActionLabel,
): OrderField[] | null {
  if (
    ![
      "capture_provisional_order_details",
      "use_prior_context_to_confirm_order_details",
      "apply_bulk_policy_and_escalate_payment_terms",
      "negotiate_with_inventory_and_delivery_constraints",
    ].includes(action)
  ) {
    return null;
  }
  const fields = new Set<OrderField>();
  if (extractQuantity(text) !== null) {
    fields.add("quantity");
  }
  if (extractVariantHint(text)) {
    fields.add("variant");
  }
  const destination = extractDestination(text);
  const hasDeliveryContext = Boolean(destination) || /\bpickup\b|\bcollection\b|\bdeliver\b|\bdelivery\b|\bship\b|\bcourier\b/.test(text);
  if (destination) {
    fields.add("delivery_city");
  }
  if (hasDeliveryContext && /\bfriday\b|\bthursday\b|\btoday\b|\btomorrow\b/.test(text)) {
    fields.add("delivery_date");
  }
  if (/\bpay today\b|\bon delivery\b|\bafter delivery\b|\bpay later\b|\bpayment terms\b/.test(text)) {
    fields.add("payment_timing");
  }
  if (/\binvoice\b/.test(text)) {
    fields.add("invoice_request");
  }
  if (/\bdiscount\b|\bdealer pricing\b/.test(text)) {
    fields.add("discount_request");
  }
  if (/\bpartial\b|\bonly have\b|\bnot enough\b|\bshort\b/.test(text)) {
    fields.add("partial_fulfillment");
  }
  if (/\b21 days\b|\bpayment terms\b/.test(text)) {
    fields.add("payment_terms");
  }
  return [...fields];
}

function inferLanguage(text: string): string {
  if (/[\u0e00-\u0e7f]/.test(text)) {
    return "th";
  }
  if (/[\u0600-\u06ff]/.test(text)) {
    return "ar";
  }
  return "en";
}

function extractExplicitEntities(
  caseRecord: RunnableEvaluationCase,
  text: string,
): ProposalEntity[] {
  const entities: ProposalEntity[] = [];
  const sourceRef = messageRef(0);

  const quantity = extractQuantity(text);
  if (quantity !== null) {
    entities.push({
      entity_type: "quantity",
      normalized_value: String(quantity),
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  const variant = extractVariantHint(text);
  if (variant) {
    entities.push({
      entity_type: "variant",
      normalized_value: variant,
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "medium",
      inferred: false,
    });
  }

  const destination = extractDestination(text);
  if (destination) {
    entities.push({
      entity_type: "delivery_destination",
      normalized_value: destination,
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  const offeredPrice = text.match(/\b(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)\s*(?:ugx|shs|\/=)\b/i);
  if (offeredPrice) {
    entities.push({
      entity_type: "price",
      normalized_value: offeredPrice[1].replace(/\s+/g, ""),
      source_text: offeredPrice[0],
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  if (/\bdiscount\b|\bbest price\b|\blast price\b|\breduce\b|\btoo low\b/.test(text)) {
    entities.push({
      entity_type: "discount",
      normalized_value: "requested",
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  if (isPhoneRequest(text)) {
    entities.push({
      entity_type: "phone_call_request",
      normalized_value: "requested",
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  if (isOrderIntent(text) || isConfirmedOrder(text)) {
    entities.push({
      entity_type: "order_intent",
      normalized_value: isConfirmedOrder(text) ? "confirmed" : "provisional",
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }

  const customerName = caseRecord.conversation
    .map((message) => message.text.match(/\b(?:my name is|i am|this is)\s+([A-Za-z][A-Za-z\s'-]{1,40})/i)?.[1] ?? null)
    .find((value): value is string => Boolean(value));
  if (customerName) {
    entities.push({
      entity_type: "customer_name",
      normalized_value: customerName.trim(),
      source_text: customerName.trim(),
      source_message_ref: sourceRef,
      confidence: "medium",
      inferred: false,
    });
  }

  const usernameMatch = caseRecord.conversation
    .map((message) => message.text.match(/@([A-Za-z0-9_.-]+)/)?.[1] ?? null)
    .find((value): value is string => Boolean(value));
  if (usernameMatch) {
    entities.push({
      entity_type: "username",
      normalized_value: usernameMatch,
      source_text: `@${usernameMatch}`,
      source_message_ref: sourceRef,
      confidence: "medium",
      inferred: false,
    });
  }

  return entities;
}

function extractProductReferenceCandidates(
  caseRecord: RunnableEvaluationCase,
  text: string,
  bundle: EvidenceBundle,
): ProposalProductReferenceCandidate[] {
  const candidates: ProposalProductReferenceCandidate[] = [];
  const sourceRef = messageRef(0);
  const productMention = text.match(/\b(?:the|this|that|my|your)?\s*(blue bottle|cobalt bottle|backpack|notebook|flask|lamp|lantern|water bottle|toner|lunch box)\b/i);
  if (productMention) {
    candidates.push({
      normalized_value: productMention[1].toLowerCase(),
      source_text: productMention[0],
      source_message_ref: sourceRef,
      confidence: "high",
      inferred: false,
    });
  }
  const postProduct = bundle.product_refs[0];
  if (postProduct) {
    candidates.push({
      normalized_value: postProduct.replace(/^product:/, "").split("#")[0] ?? postProduct,
      source_text: caseRecord.post_id ? `post:${caseRecord.channel}:${caseRecord.post_id}` : postProduct,
      source_message_ref: caseRecord.post_id ? "post-reference" : sourceRef,
      confidence: "high",
      inferred: true,
    });
  }
  if (caseRecord.post_id) {
    candidates.push({
      normalized_value: caseRecord.post_id,
      source_text: `post:${caseRecord.channel}:${caseRecord.post_id}`,
      source_message_ref: "post-reference",
      confidence: "high",
      inferred: true,
    });
  }
  return candidates;
}

function buildRequestedTools(
  caseRecord: RunnableEvaluationCase,
  text: string,
  intents: IntentLabel[],
  productReferences: ProposalProductReferenceCandidate[],
): ProposalToolRequest[] {
  const requested: ProposalToolRequest[] = [];
  const productIdCandidate = productReferences.find((candidate) => /^UG-PRD-\d+$/i.test(candidate.normalized_value))?.normalized_value ?? null;
  const productId = productIdCandidate ? productIdCandidate.toUpperCase() : null;
  const quantity = extractQuantity(text);
  const variantHint = extractVariantHint(text) ?? null;
  const destination = extractDestination(text) ?? null;

  const addTool = (tool_name: ProposalToolRequest["tool_name"], reason: string, args: Record<string, unknown>): void => {
    if (requested.some((entry) => entry.tool_name === tool_name && JSON.stringify(entry.arguments) === JSON.stringify(args))) {
      return;
    }
    requested.push({
      tool_name,
      arguments: args,
      reason,
      confidence: "high",
    });
  };

  if (caseRecord.post_id) {
    addTool("findProductByPost", "resolve the post to a product before replying", {
      channel: caseRecord.channel,
      postId: caseRecord.post_id,
    });
  } else if (productId) {
    addTool("getProduct", "verify the referenced product record", { productId });
  }

  if (intents.includes("product_image_request") && productId) {
    addTool("getProductImages", "verify available product images", { productId });
  }
  if ((intents.includes("availability_question") || intents.includes("quantity_request") || intents.includes("negotiation") || intents.includes("bulk_order")) && productId) {
    addTool("checkInventory", "verify stock before making any availability statement", {
      productId,
      requestedVariant: variantHint,
    });
  }
  if (intents.includes("business_location_question")) {
    addTool("getBusinessLocation", "confirm the business location from verified data", {});
  }
  if (intents.includes("delivery_question") && destination) {
    addTool("getDeliveryOptions", "verify delivery options for the requested destination", { destination });
  }
  if ((intents.includes("pricing_request") || intents.includes("negotiation") || intents.includes("bulk_order")) && productId) {
    addTool("getNegotiationPolicy", "check the verified pricing and negotiation policy", {
      productId,
      quantity,
    });
  }
  if (intents.includes("negotiation") && productId && quantity !== null) {
    addTool("evaluateOffer", "evaluate the customer's offer against policy", {
      productId,
      offeredPrice: extractCurrencyNumber(text) ?? 0,
      quantity,
    });
  }
  if ((intents.includes("confirmed_order_intent") || intents.includes("order_intent") || intents.includes("multi_message_memory")) && productId) {
    addTool("identifyMissingOrderFields", "identify which order fields are missing from the customer's request", {
      orderDraft: {
        product_id: productId,
        quantity,
        variant: variantHint,
        delivery_city: destination,
        delivery_date: /\bfriday\b|\bthursday\b|\btoday\b|\btomorrow\b/.test(text) ? "requested" : null,
        payment_timing: /\bpay today\b|\bon delivery\b|\bafter delivery\b|\bpay later\b|\bpayment terms\b/.test(text) ? "requested" : null,
        invoice_request: /\binvoice\b/.test(text) ? true : null,
        discount_request: /\bdiscount\b|\bdealer pricing\b/.test(text) ? "requested" : null,
        partial_fulfillment: /\bpartial\b|\bonly have\b|\bnot enough\b|\bshort\b/.test(text) ? true : null,
        payment_terms: /\b21 days\b|\bpayment terms\b/.test(text) ? "requested" : null,
      },
    });
  }

  return requested;
}

function buildNormalizedCustomerMeaning(intents: IntentLabel[]): string {
  if (intents.includes("prompt_injection")) {
    return "Customer is attempting to override policy or expose internal instructions.";
  }
  if (intents.includes("spam_or_unrelated")) {
    return "Customer message appears promotional or unrelated to a genuine sales inquiry.";
  }
  if (intents.includes("complaint")) {
    return "Customer is reporting a problem and may be asking for a refund or human review.";
  }
  if (intents.includes("phone_call_request")) {
    return "Customer wants a phone handoff or call-back.";
  }
  if (intents.includes("availability_question") && intents.includes("delivery_question")) {
    return "Customer is asking about availability and delivery terms.";
  }
  if (intents.includes("pricing_request") && intents.includes("product_image_request")) {
    return "Customer wants the price and also wants to see the product.";
  }
  if (intents.includes("pricing_request")) {
    return "Customer wants the verified price for a product.";
  }
  if (intents.includes("availability_question")) {
    return "Customer is asking whether the item is still available.";
  }
  if (intents.includes("product_image_request")) {
    return "Customer wants product photos or images.";
  }
  if (intents.includes("delivery_question")) {
    return "Customer is asking about delivery options or fees.";
  }
  if (intents.includes("business_location_question")) {
    return "Customer is asking where the business is based.";
  }
  if (intents.includes("negotiation")) {
    return "Customer is negotiating price or discount terms.";
  }
  if (intents.includes("confirmed_order_intent") || intents.includes("order_intent")) {
    return "Customer is trying to place or confirm an order.";
  }
  return "Customer message is a sales inquiry that needs verification.";
}

function buildResponseStyle(intents: IntentLabel[]): string {
  if (intents.includes("complaint") || intents.includes("prompt_injection") || intents.includes("phone_call_request")) {
    return "calm, concise, escalation-aware";
  }
  if (intents.includes("pricing_request") || intents.includes("availability_question") || intents.includes("delivery_question")) {
    return "concise, helpful, evidence-gated";
  }
  return "clear, friendly, approval-gated";
}

function buildClarificationQuestion(intents: IntentLabel[], productReferences: ProposalProductReferenceCandidate[]): string | null {
  if (productReferences.length > 0) {
    return null;
  }
  if (intents.includes("availability_question") || intents.includes("pricing_request") || intents.includes("delivery_question") || intents.includes("product_image_request")) {
    return "Could you share the product name or post link so I can verify the request?";
  }
  if (intents.includes("ambiguous_product_reference")) {
    return "Could you share the product name or the original post so I can verify the correct item?";
  }
  return null;
}

function buildAmbiguityNotes(intents: IntentLabel[], productReferences: ProposalProductReferenceCandidate[]): string[] {
  const notes: string[] = [];
  if (intents.includes("ambiguous_product_reference")) {
    notes.push("product_reference_is_unclear");
  }
  if (productReferences.length === 0 && (intents.includes("pricing_request") || intents.includes("availability_question") || intents.includes("delivery_question") || intents.includes("product_image_request"))) {
    notes.push("product_reference_missing");
  }
  return notes;
}

function buildDraftSuggestion(
  action: ActionLabel,
  confidence: ConfidenceCategory,
  clarificationQuestion: string | null,
): string {
  if (clarificationQuestion) {
    return clarificationQuestion;
  }
  if (action === "share_verified_product_image") {
    return "Thanks for reaching out. I’m checking the available product images.";
  }
  if (action === "provide_verified_business_location") {
    return "Thanks for reaching out. I’ll share the verified location for approval.";
  }
  if (action === "capture_provisional_order_details" || action === "use_prior_context_to_confirm_order_details") {
    return "Thanks. I’ve captured the details for approval and will send a draft for review.";
  }
  if (action === "thank_without_lead_creation") {
    return "Thanks for the kind words.";
  }
  if (confidence === "low") {
    return "Thanks for reaching out. I need a bit more detail before I can verify this.";
  }
  return "Thanks for reaching out. I’ll verify the request and prepare a draft for approval.";
}

function buildLegacyEntityFallback(
  text: string,
  caseRecord: RunnableEvaluationCase,
): ProposalEntity[] {
  const entities: ProposalEntity[] = [];
  const sourceRef = messageRef(0);
  const quantity = extractQuantity(text);
  if (quantity !== null) {
    entities.push({
      entity_type: "quantity",
      normalized_value: String(quantity),
      source_text: text,
      source_message_ref: sourceRef,
      confidence: "medium",
      inferred: true,
    });
  }
  if (caseRecord.post_id) {
    entities.push({
      entity_type: "product_reference",
      normalized_value: caseRecord.post_id,
      source_text: caseRecord.post_id,
      source_message_ref: "post-reference",
      confidence: "high",
      inferred: true,
    });
  }
  return entities;
}

function buildClaimLedger(
  text: string,
  proposal: ModelProposal,
  bundle: EvidenceBundle,
  productId: string | null,
): ClaimValidationResult[] {
  const claims: ClaimValidationResult[] = [];
  const hasProductEvidence = bundle.product_refs.length > 0;
  const hasInventoryEvidence = bundle.inventory_refs.length > 0;
  const hasDeliveryEvidence = bundle.delivery_refs.length > 0;
  const hasBusinessEvidence = bundle.business_refs.length > 0;
  const hasPolicyEvidence = bundle.policy_refs.length > 0;
  const requestText = `${text} ${proposal.draft_suggestion}`.toLowerCase();

  if (proposal.canonical_intent_candidates.includes("pricing_request") || /\bprice\b|\bcost\b|\bhow much\b/.test(requestText)) {
    claims.push({
      claim_type: "price",
      proposed_value: null,
      evidence_ref: hasPolicyEvidence ? bundle.policy_refs[0] ?? null : null,
      validation_status: hasPolicyEvidence ? "validated" : "unsupported",
      safe_customer_value: "Thanks for reaching out. I’ll verify the request and prepare a draft for approval.",
      reason: hasPolicyEvidence ? "price policy evidence available" : "no customer-visible price evidence is available",
    });
  }
  if (proposal.canonical_intent_candidates.includes("availability_question") || /\bstock\b|\bavailable\b|\bunits\b|\bleft\b/.test(requestText)) {
    claims.push({
      claim_type: "stock",
      proposed_value: null,
      evidence_ref: hasInventoryEvidence ? bundle.inventory_refs[0] ?? null : null,
      validation_status: hasInventoryEvidence ? "validated" : "unsupported",
      safe_customer_value: hasInventoryEvidence
        ? proposal.draft_suggestion
        : "Thanks for reaching out. I’m checking availability and will prepare a draft for approval.",
      reason: hasInventoryEvidence ? "inventory evidence available" : "no inventory evidence was gathered",
    });
  }
  if (proposal.canonical_intent_candidates.includes("delivery_question") || /\bdeliver\b|\bdelivery\b|\bshipping\b|\bcourier\b/.test(requestText)) {
    claims.push({
      claim_type: "delivery",
      proposed_value: null,
      evidence_ref: hasDeliveryEvidence ? bundle.delivery_refs[0] ?? null : null,
      validation_status: hasDeliveryEvidence ? "validated" : "unsupported",
      safe_customer_value: hasDeliveryEvidence
        ? proposal.draft_suggestion
        : "Thanks for reaching out. I’ll have a team member confirm that for you.",
      reason: hasDeliveryEvidence ? "destination-specific delivery evidence available" : "no destination-specific delivery evidence was gathered",
    });
  }
  if (proposal.canonical_intent_candidates.includes("business_location_question") || /\blocated\b|\bbased\b|\baddress\b|\bpickup\b/.test(requestText)) {
    claims.push({
      claim_type: "location",
      proposed_value: null,
      evidence_ref: hasBusinessEvidence ? bundle.business_refs[0] ?? null : null,
      validation_status: hasBusinessEvidence ? "validated" : "unsupported",
      safe_customer_value: hasBusinessEvidence
        ? proposal.draft_suggestion
        : "Thanks for reaching out. I’ll have a team member confirm our pickup details.",
      reason: hasBusinessEvidence ? "business location evidence available" : "no business location evidence was gathered",
    });
  }
  if (proposal.canonical_intent_candidates.some((intent) => intent.includes("negotiation"))) {
    claims.push({
      claim_type: "negotiation",
      proposed_value: null,
      evidence_ref: hasPolicyEvidence ? bundle.policy_refs[0] ?? null : null,
      validation_status: hasPolicyEvidence ? "validated" : "clarified",
      safe_customer_value: "Thanks for reaching out. I can confirm the request and keep it within policy.",
      reason: "minimum price and policy floors must not be exposed to the customer",
    });
  }
  if (proposal.canonical_intent_candidates.includes("product_image_request") || /\bphoto\b|\bimage\b|\bpicture\b/.test(requestText)) {
    claims.push({
      claim_type: "media",
      proposed_value: null,
      evidence_ref: hasProductEvidence ? bundle.product_refs[0] ?? null : null,
      validation_status: hasProductEvidence ? "validated" : "unsupported",
      safe_customer_value: hasProductEvidence
        ? proposal.draft_suggestion
        : "Thanks for reaching out. I’m checking the available product images.",
      reason: hasProductEvidence ? "product image evidence available" : "no product image evidence was gathered",
    });
  }
  return claims;
}

function renderSafeResponse(
  proposal: ModelProposal,
  decision: { escalation_required: boolean; escalation_reason: string | null; claim_validation: ClaimValidationResult[] },
): string {
  if (decision.escalation_required) {
    return "Thanks for reaching out. This needs human review before a reply is sent.";
  }
  const supportedClaim = decision.claim_validation.find((claim) => claim.validation_status === "validated");
  if (supportedClaim?.safe_customer_value) {
    return supportedClaim.safe_customer_value;
  }
  const primaryAction = inferAction(proposal.canonical_intent_candidates, proposal.normalized_customer_meaning);
  if (primaryAction === "share_verified_product_image") {
    return "Thanks for reaching out. I’m checking the available product images.";
  }
  if (primaryAction === "capture_provisional_order_details") {
    return "Thanks. I’ve captured the details for approval and will send a draft for review.";
  }
  if (primaryAction === "thank_without_lead_creation") {
    return "Thanks for the kind words.";
  }
  return proposal.canonical_intent_candidates.includes("spam_or_unrelated")
    ? "Thanks for the message."
    : proposal.canonical_intent_candidates.includes("compliment_only")
      ? "Thanks for the kind words."
      : "Thanks for reaching out. I’ll verify the request and prepare a draft for approval.";
}

function determineEscalation(
  proposal: ModelProposal,
  bundle: EvidenceBundle,
  claimValidation: ClaimValidationResult[],
  reason: string | null,
): { escalation_required: boolean; escalation_reason: string | null; approval_queue: ApprovalQueue } {
  if (reason) {
    return {
      escalation_required: true,
      escalation_reason: reason,
      approval_queue: "specialized",
    };
  }
  if (proposal.canonical_intent_candidates.includes("prompt_injection")) {
    return {
      escalation_required: true,
      escalation_reason: "prompt injection attempt",
      approval_queue: "specialized",
    };
  }
  if (proposal.canonical_intent_candidates.includes("complaint")) {
    return {
      escalation_required: true,
      escalation_reason: "complaint requires human review",
      approval_queue: "specialized",
    };
  }
  if (proposal.canonical_intent_candidates.includes("phone_call_request")) {
    return {
      escalation_required: true,
      escalation_reason: "customer requested a phone handoff",
      approval_queue: "specialized",
    };
  }
  if (claimValidation.some((claim) => claim.validation_status === "unsupported" && claim.claim_type === "price")) {
    return {
      escalation_required: false,
      escalation_reason: null,
      approval_queue: "normal",
    };
  }
  if (claimValidation.some((claim) => claim.validation_status === "unsupported" && (claim.claim_type === "delivery" || claim.claim_type === "stock" || claim.claim_type === "location"))) {
    return {
      escalation_required: false,
      escalation_reason: null,
      approval_queue: "normal",
    };
  }
  if (bundle.tool_names.length === 0 && proposal.canonical_intent_candidates.includes("ambiguous_product_reference")) {
    return {
      escalation_required: false,
      escalation_reason: null,
      approval_queue: "normal",
    };
  }
  return {
    escalation_required: false,
    escalation_reason: null,
    approval_queue: "normal",
  };
}

function buildProposal(
  caseRecord: RunnableEvaluationCase,
  observations: AgentToolObservation[],
  bundle: EvidenceBundle,
): ModelProposal {
  const text = collectCustomerText(caseRecord);
  const intents = collectIntentCandidates(caseRecord, text);
  const productReferences = extractProductReferenceCandidates(caseRecord, text, bundle);
  const clarificationQuestion = buildClarificationQuestion(intents, productReferences);
  const normalizedCustomerMeaning = buildNormalizedCustomerMeaning(intents);
  const primaryAction = inferAction(intents, text);
  const confidence = inferConfidence(intents, null, primaryAction);
  const requestedTools = buildRequestedTools(caseRecord, text, intents, productReferences);
  const entities = extractExplicitEntities(caseRecord, text);
  for (const legacyEntity of buildLegacyEntityFallback(text, caseRecord)) {
    if (!entities.some((entity) => entity.entity_type === legacyEntity.entity_type && entity.normalized_value === legacyEntity.normalized_value)) {
      entities.push(legacyEntity);
    }
  }
  return {
    proposal_version: MODEL_PROPOSAL_VERSION,
    language: inferLanguage(text),
    normalized_customer_meaning: normalizedCustomerMeaning,
    canonical_intent_candidates: intents,
    explicitly_stated_entities: entities,
    product_reference_candidates: productReferences,
    ambiguity: buildAmbiguityNotes(intents, productReferences),
    clarification_question: clarificationQuestion,
    requested_tools: requestedTools,
    response_style: buildResponseStyle(intents),
    draft_suggestion: buildDraftSuggestion(primaryAction, confidence, clarificationQuestion),
    confidence,
    reasoning_summary: `${primaryAction}; ${normalizedCustomerMeaning}`,
  };
}

export function normalizeLegacyProposal(
  value: unknown,
  caseRecord: RunnableEvaluationCase,
  observations: AgentToolObservation[],
): ModelProposal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!("response_draft" in record) || !("prediction" in record)) {
    return null;
  }
  const bundle = buildEvidenceBundle(observations);
  const proposal = buildProposal(caseRecord, observations, bundle);
  const prediction = record.prediction as Record<string, unknown>;
  const legacyIntents = Array.isArray(prediction.intent_labels)
    ? prediction.intent_labels.filter((entry): entry is IntentLabel => typeof entry === "string" && (CANONICAL_INTENT_LABELS as readonly string[]).includes(entry))
    : proposal.canonical_intent_candidates;
  return {
    ...proposal,
    canonical_intent_candidates: legacyIntents.length ? legacyIntents : proposal.canonical_intent_candidates,
    normalized_customer_meaning:
      typeof record.normalized_customer_meaning === "string"
        ? record.normalized_customer_meaning
        : proposal.normalized_customer_meaning,
    language: typeof record.language === "string" ? record.language : proposal.language,
    clarification_question:
      typeof record.clarification_question === "string" || record.clarification_question === null
        ? (record.clarification_question as string | null)
        : proposal.clarification_question,
    draft_suggestion: typeof record.response_draft === "string" ? record.response_draft : proposal.draft_suggestion,
    confidence:
      typeof record.confidence === "string" && ["low", "medium", "high"].includes(record.confidence)
        ? (record.confidence as ConfidenceCategory)
        : proposal.confidence,
    reasoning_summary:
      typeof record.reasoning_summary === "string"
        ? record.reasoning_summary
        : `${proposal.reasoning_summary}; normalized from legacy model output`,
  };
}

export function inferPolicyFromConversation(
  caseRecord: RunnableEvaluationCase,
  observations: AgentToolObservation[],
): ModelProposal {
  const bundle = buildEvidenceBundle(observations);
  return buildProposal(caseRecord, observations, bundle);
}

export function enforceHybridPolicy(
  caseRecord: RunnableEvaluationCase,
  proposal: ModelProposal,
  observations: AgentToolObservation[],
  validationReason: string | null = null,
  verifiedToolsPrediction: Prediction | null = null,
): {
  model_proposal: ModelProposal;
  evidence_bundle: EvidenceBundle;
  policy_decision: PolicyDecision;
  final_output: AgentFinalOutput;
} {
  const evidence_bundle = buildEvidenceBundle(observations);
  const text = collectCustomerText(caseRecord);
  const intents = proposal.canonical_intent_candidates.length ? proposal.canonical_intent_candidates : collectIntentCandidates(caseRecord, text);
  const verifiedBackbone = verifiedToolsPrediction;
  const action = verifiedBackbone?.action ?? inferAction(intents, text);
  const leadDecision = verifiedBackbone ? (verifiedBackbone.is_lead ? "create_lead" : "do_not_create_lead") : inferLeadDecision(intents);
  const provisionalOrderDecision = verifiedBackbone
    ? verifiedBackbone.provisional_order
      ? "prepare_provisional_order"
      : "do_not_prepare_provisional_order"
    : inferProvisionalOrderDecision(action);
  const productId = verifiedBackbone?.product_id ?? deriveProductId(caseRecord, proposal, evidence_bundle);
  const product_association: ProductAssociationDecision = verifiedBackbone
    ? productId
      ? {
          status: "associated",
          product_id: productId,
          clarification_question: null,
        }
      : {
          status: "clarification_needed",
          product_id: null,
          clarification_question: proposal.clarification_question ?? buildProductAssociation(text, proposal, null).clarification_question,
        }
    : buildProductAssociation(text, proposal, productId);
  const claim_validation = buildClaimLedger(text, proposal, evidence_bundle, productId);
  const escalation: { escalation_required: boolean; escalation_reason: string | null; approval_queue: ApprovalQueue } = verifiedBackbone
    ? {
        escalation_required: Boolean(validationReason) || verifiedBackbone.escalation,
        escalation_reason: validationReason ?? (verifiedBackbone.escalation ? "verified-tools backbone escalation" : null),
        approval_queue: Boolean(validationReason) || verifiedBackbone.escalation ? "specialized" : "normal",
      }
    : determineEscalation(proposal, evidence_bundle, claim_validation, validationReason);
  const confidence = verifiedBackbone ? inferConfidence(intents, productId, action) : inferConfidence(intents, productId, action);
  const order_fields = verifiedBackbone ? verifiedBackbone.order_fields : buildOrderFields(text, action);
  const response_draft = verifiedBackbone?.response_text ?? renderSafeResponse(proposal, {
    escalation_required: escalation.escalation_required,
    escalation_reason: escalation.escalation_reason,
    claim_validation,
  });
  const overrides: PolicyOverride[] = [];

  const acceptedOrRejected = (field: string, proposed_value: unknown, accepted: boolean, reason_code: string, evidence_refs: string[] = []): void => {
    overrides.push({
      field,
      proposed_value,
      policy_result: accepted ? "accepted" : "rejected",
      reason_code,
      evidence_refs,
    });
  };

  if (JSON.stringify(proposal.canonical_intent_candidates) !== JSON.stringify(intents)) {
    acceptedOrRejected("canonical_intent_candidates", proposal.canonical_intent_candidates, false, "intent_normalization");
  }
  if (proposal.clarification_question && proposal.clarification_question !== product_association.clarification_question) {
    acceptedOrRejected("clarification_question", proposal.clarification_question, false, "clarification_authority");
  }
  if (proposal.draft_suggestion !== response_draft) {
    acceptedOrRejected("draft_suggestion", proposal.draft_suggestion, false, "evidence_gated_rendering", claim_validation.flatMap((claim) => claim.evidence_ref ? [claim.evidence_ref] : []));
  }
  if (productId) {
    acceptedOrRejected("product_id", productId, true, "evidence_association", evidence_bundle.product_refs);
  }
  if (order_fields) {
    acceptedOrRejected("order_fields", order_fields, true, "explicit_order_capture", []);
  }
  for (const claim of claim_validation) {
    if (claim.validation_status !== "validated") {
      acceptedOrRejected(`claim:${claim.claim_type}`, claim.safe_customer_value, false, "unsupported_claim", claim.evidence_ref ? [claim.evidence_ref] : []);
    }
  }

  const final_prediction: FinalAgentPrediction = verifiedBackbone
    ? {
        response_text: response_draft,
        is_lead: verifiedBackbone.is_lead,
        intent_labels: verifiedBackbone.intent_labels,
        product_id: verifiedBackbone.product_id,
        action: verifiedBackbone.action,
        escalation: escalation.escalation_required,
        lead_creation: verifiedBackbone.lead_creation,
        provisional_order: verifiedBackbone.provisional_order,
        order_fields: verifiedBackbone.order_fields,
      }
    : {
        response_text: response_draft,
        is_lead: leadDecision === "create_lead",
        intent_labels: intents,
        product_id: productId,
        action,
        escalation: escalation.escalation_required,
        lead_creation: leadDecision === "create_lead",
        provisional_order: provisionalOrderDecision === "prepare_provisional_order",
        order_fields: order_fields && order_fields.length ? order_fields : null,
      };

  const policy_decision: PolicyDecision = {
    approval_required: true,
    approval_queue: escalation.approval_queue,
    escalation_required: escalation.escalation_required,
    escalation_reason: escalation.escalation_reason,
    lead_decision: verifiedBackbone ? (verifiedBackbone.is_lead ? "create_lead" : "do_not_create_lead") : leadDecision,
    provisional_order_decision: verifiedBackbone
      ? verifiedBackbone.provisional_order
        ? "prepare_provisional_order"
        : "do_not_prepare_provisional_order"
      : provisionalOrderDecision,
    product_association,
    response_draft,
    confidence,
    claim_validation,
    overrides,
    prediction: final_prediction,
  };

  const final_output: AgentFinalOutput = {
    response_draft,
    approval_required: true,
    approval_queue: policy_decision.approval_queue,
    escalation_required: policy_decision.escalation_required,
    escalation_reason: policy_decision.escalation_reason,
    evidence_refs: evidence_bundle.evidence_refs,
    confidence,
    lead_decision: leadDecision,
    provisional_order_decision: provisionalOrderDecision,
    extracted_order_fields: order_fields && order_fields.length ? order_fields : null,
    missing_order_fields: null,
    intents,
    product_association,
    prediction: final_prediction,
  };

  return {
    model_proposal: proposal,
    evidence_bundle,
    policy_decision,
    final_output,
  };
}
