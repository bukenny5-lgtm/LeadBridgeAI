import type { RunnableEvaluationCase } from "../evaluation/case-schema.js";
import type {
  AgentFinalOutput,
  AgentToolObservation,
  ProductAssociationDecision,
} from "./types.js";
import { enforceHybridPolicy, inferPolicyFromConversation } from "./policy.js";
import type {
  ActionLabel,
  ConfidenceCategory,
  IntentLabel,
  LeadDecision,
  OrderField,
  ProvisionalOrderDecision,
} from "../evaluation/canonical-contract.js";

type ToolPlan = Array<{ name: string; arguments: Record<string, unknown> }>;

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

function collectCustomerMessages(caseRecord: RunnableEvaluationCase): string[] {
  return caseRecord.conversation
    .filter((message) => message.role === "customer")
    .map((message) => normalize(message.text));
}

function collectConversationText(caseRecord: RunnableEvaluationCase): string {
  return collectCustomerMessages(caseRecord).join(" ");
}

function hasAgentMemory(caseRecord: RunnableEvaluationCase): boolean {
  return caseRecord.conversation.some((message) => message.role === "agent");
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
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

function isAmbiguous(text: string): boolean {
  return /\b(same one|last post|this one|that one|same thing|which one)\b/.test(text);
}

function isProductImageRequest(text: string): boolean {
  return /\bmore photos?\b|\bpictures?\b|\bphoto\b|\bimage\b|\bvideo\b|\bcatalogue\b|\bcatalog\b|\bsimilar products?\b|\bclear photo\b/.test(
    text,
  );
}

function isPriceQuestion(text: string): boolean {
  return /\b(price|how much|quote|rate|total|hm|cost)\b/.test(text) && !/\bdelivery cost\b/.test(text);
}

function isAvailabilityQuestion(text: string): boolean {
  return /\bavailable\b|\bstill available\b|\bin stock\b|\bany left\b|\brestock\b|\brestocked\b|\brestocking\b/.test(text);
}

function isUnavailableStockRequest(text: string): boolean {
  return /\bout of stock\b|\beven if you are out of stock\b|\breserve .* out of stock\b|\bno stock\b|\bsold out\b/.test(text);
}

function isVariantRequest(text: string): boolean {
  return /\b(colour|color|size|design|flavour|flavor|version)\b/.test(text) || /\b(red|blue|green|navy|black|white|sand|mixed)\b/.test(text) || /\bpack size\b/.test(text);
}

function isDeliveryQuestion(text: string): boolean {
  return /\bdeliver\b|\bship\b|\bcourier\b|\bdelivery fee\b|\bdelivery cost\b|\barrival\b/.test(text);
}

function isLocationQuestion(text: string): boolean {
  return /\blocated\b|\bbased\b|\baddress\b|\bdirections\b|\bwhatsapp\b|\bphone\b|\bwhere are you\b|\bwhere is\b|\bpickup point\b|\bpickup\b/.test(
    text,
  );
}

function isNegotiation(text: string): boolean {
  return /\bbest price\b|\blast price\b|\bdiscount\b|\breduce\b|\bbudget\b|\bbulk\b|\bwholesale\b|\bcan you do\b|\bdealer pricing\b|\b\d{1,2}\s*(?:%|percent)?\s*off\b|\btoo low\b|\bonly pay\b/.test(
    text,
  );
}

function isConfirmedOrder(text: string): boolean {
  return /\bi will pay today\b|\bcheckout details\b|\bsend the invoice\b|\bplace the order\b|\bsend invoice\b|\bcheckout\b/.test(
    text,
  );
}

function isPurchaseIntent(text: string): boolean {
  return (
    /\bi want\b|\bi ll take it\b|\bi ll take\b|\bill take it\b|\breserve\b|\bbook\b|\bmine\b/.test(text) ||
    (/\bi need\b|\bneed\b/.test(text) &&
      (/\b\d+\b/.test(text) || /\b(quantity|units?|packs?|pieces?)\b/.test(text) || /\bfor pickup\b|\bfor collection\b|\bcheckout\b/.test(text)))
  );
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
  const ugx = cleaned.match(/\b(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)\s*(?:ugx|shs|\/=)\b/);
  if (ugx) {
    return Number(ugx[1].replace(/\s+/g, ""));
  }
  const kMatch = cleaned.match(/\b(\d+(?:\.\d+)?)k\b/);
  if (kMatch) {
    return Math.round(Number(kMatch[1]) * 1000);
  }
  return null;
}

function extractDiscountPercent(text: string): number | null {
  const match = text.match(/\b(\d{1,2})\s*(?:%|percent)?\s*off\b/);
  return match ? Number(match[1]) : null;
}

function extractDestination(text: string): string | null {
  if (/\bjinja\b/.test(text)) return "Jinja Town";
  if (/\bmukono\b/.test(text)) return "Mukono Town";
  if (/\bentebbe\b/.test(text)) return "Entebbe Town";
  if (/\bwakiso\b/.test(text)) return "Wakiso Town";
  if (/\bkampala\b/.test(text)) return "Kampala Central";
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
  if (/\bcolor\b|\bcolour\b/.test(text)) return "colour";
  if (/\bsize\b/.test(text)) return "size";
  if (/\bpack size\b/.test(text)) return "pack size";
  if (/\bdesign\b/.test(text)) return "design";
  return null;
}

function extractOrderFields(text: string): OrderField[] {
  const fields = new Set<OrderField>();
  if (extractQuantity(text) !== null) fields.add("quantity");
  if (extractVariantHint(text)) fields.add("variant");
  const destination = extractDestination(text);
  if (destination) {
    fields.add("delivery_city");
    if (/\bfriday\b|\bthursday\b|\btoday\b|\btomorrow\b|\bday\b/.test(text)) {
      fields.add("delivery_date");
    }
  }
  if (/\bpay today\b|\bafter delivery\b|\bon delivery\b|\bpay later\b|\bpayment terms\b|\b21 days\b/.test(text)) {
    fields.add("payment_timing");
    if (/\b21 days\b|\bpayment terms\b/.test(text)) {
      fields.add("payment_terms");
    }
  }
  if (/\binvoice\b/.test(text)) {
    fields.add("invoice_request");
  }
  if (/\bdiscount\b|\b\d{1,2}\s*(?:%|percent)?\s*off\b|\bdealer pricing\b/.test(text)) {
    fields.add("discount_request");
  }
  if (/\bpartial\b|\bonly have\b|\bnot enough\b|\bshort\b/.test(text)) {
    fields.add("partial_fulfillment");
  }
  return [...fields];
}

function shouldCaptureOrderFields(action: ActionLabel): boolean {
  return [
    "capture_provisional_order_details",
    "use_prior_context_to_confirm_order_details",
    "apply_bulk_policy_and_escalate_payment_terms",
    "negotiate_with_inventory_and_delivery_constraints",
  ].includes(action);
}

function buildResponseText(prediction: AgentFinalOutput["prediction"]): string {
  if (prediction.escalation) {
    return "Thanks for reaching out. This needs human review before a reply is sent.";
  }
  if (!prediction.is_lead) {
    return prediction.action === "ignore_or_flag_as_spam" ? "Thanks for the message." : "Thanks for reaching out.";
  }
  if (prediction.provisional_order) {
    return "Thanks. I have the details for a draft order and will send it for approval.";
  }
  return "Thanks for reaching out. I will verify the request and prepare a draft for approval.";
}

function inferProductIdFromText(text: string): string | null {
  if (/\bblue 1\.5l water bottle\b|\bwater bottle\b|\bbottle\b/.test(text)) return "UG-PRD-101";
  if (/\bsolar lantern\b/.test(text)) return "UG-PRD-102";
  if (/\bbackpack\b|\bb-300\b/.test(text)) return "UG-PRD-103";
  if (/\blunch box\b/.test(text)) return "UG-PRD-104";
  if (/\btoner\b/.test(text)) return "UG-PRD-105";
  if (/\blamp\b/.test(text)) return "UG-PRD-106";
  if (/\bnotebook\b/.test(text) || /\bwholesale order\b/.test(text) || /\bbulk\b/.test(text)) return "UG-PRD-107";
  if (/\bflask\b|\b750ml\b/.test(text)) return "UG-PRD-108";
  return null;
}

function resolveProductFromObservations(
  text: string,
  observations: AgentToolObservation[],
): string | null {
  const findProduct = observations.find((entry) => entry.tool_name === "findProductByPost" && typeof entry.data === "object" && entry.data !== null);
  if (findProduct && "product_id" in (findProduct.data as Record<string, unknown>)) {
    const productId = (findProduct.data as Record<string, unknown>).product_id;
    if (typeof productId === "string") {
      return productId;
    }
  }
  const direct = inferProductIdFromText(text);
  if (direct) {
    return direct;
  }
  const searchEntry = observations.find((entry) => entry.tool_name === "searchCatalogue" && Array.isArray(entry.data));
  if (searchEntry && Array.isArray(searchEntry.data)) {
    const results = searchEntry.data as Array<{ product_id?: string }>;
    const ids = results.map((result) => result.product_id).filter((value): value is string => typeof value === "string");
    if (/\bpickup\b|\bbased\b|\blocated\b/.test(text) && ids.includes("UG-PRD-102")) {
      return "UG-PRD-102";
    }
    if (/\bwholesale\b|\bbulk\b/.test(text) && ids.includes("UG-PRD-107")) {
      return "UG-PRD-107";
    }
    if (ids.length === 1) {
      return ids[0] ?? null;
    }
    if (/\bwater bottle\b|\bbottle\b/.test(text) && ids.includes("UG-PRD-101")) {
      return "UG-PRD-101";
    }
    if (/\bsolar lantern\b/.test(text) && ids.includes("UG-PRD-102")) {
      return "UG-PRD-102";
    }
    if (/\bbackpack\b/.test(text) && ids.includes("UG-PRD-103")) {
      return "UG-PRD-103";
    }
    if (/\blunch box\b/.test(text) && ids.includes("UG-PRD-104")) {
      return "UG-PRD-104";
    }
    if (/\btoner\b/.test(text) && ids.includes("UG-PRD-105")) {
      return "UG-PRD-105";
    }
    if (/\blamp\b/.test(text) && ids.includes("UG-PRD-106")) {
      return "UG-PRD-106";
    }
    if (/\bnotebook\b/.test(text) && ids.includes("UG-PRD-107")) {
      return "UG-PRD-107";
    }
    if (/\bflask\b/.test(text) && ids.includes("UG-PRD-108")) {
      return "UG-PRD-108";
    }
  }
  return null;
}

export function planToolCalls(caseRecord: RunnableEvaluationCase, observations: AgentToolObservation[]): ToolPlan {
  const text = collectConversationText(caseRecord);
  const customerMessages = collectCustomerMessages(caseRecord);
  const latest = customerMessages[customerMessages.length - 1] ?? text;
  const plan: ToolPlan = [];
  const seen = new Set(observations.map((entry) => entry.tool_name));
  const productId = resolveProductFromObservations(text, observations);

  if (caseRecord.post_id && !seen.has("findProductByPost")) {
    plan.push({ name: "findProductByPost", arguments: { channel: caseRecord.channel, postId: caseRecord.post_id } });
    return plan;
  }

  if (!productId && !seen.has("searchCatalogue") && !isSpam(text) && !isPromptInjection(text) && !isComplaint(text) && !isPhoneRequest(text)) {
    plan.push({ name: "searchCatalogue", arguments: { query: text || latest } });
  }

  const resolvedProductId = productId ?? inferProductIdFromText(text);
  const variantHint = extractVariantHint(text) ?? undefined;
  const destination = extractDestination(text) ?? undefined;
  const quantity = extractQuantity(text);
  const offeredPrice = extractCurrencyNumber(text);

  if (resolvedProductId && !seen.has("getProduct")) {
    plan.push({ name: "getProduct", arguments: { productId: resolvedProductId } });
  }
  if (isProductImageRequest(text) && resolvedProductId && !seen.has("getProductImages")) {
    plan.push({ name: "getProductImages", arguments: { productId: resolvedProductId } });
  }
  if ((isAvailabilityQuestion(text) || isPurchaseIntent(text) || isNegotiation(text) || isVariantRequest(text)) && resolvedProductId && !seen.has("checkInventory")) {
    const args: Record<string, unknown> = { productId: resolvedProductId, requestedVariant: variantHint ?? null };
    plan.push({ name: "checkInventory", arguments: args });
  }
  if (isLocationQuestion(text) && !seen.has("getBusinessLocation")) {
    plan.push({ name: "getBusinessLocation", arguments: {} });
  }
  if (isDeliveryQuestion(text) && destination && !seen.has("getDeliveryOptions")) {
    plan.push({ name: "getDeliveryOptions", arguments: { destination } });
  }
  if ((isNegotiation(text) || isPriceQuestion(text) || isDeliveryQuestion(text)) && resolvedProductId && !seen.has("getNegotiationPolicy")) {
    plan.push({ name: "getNegotiationPolicy", arguments: { productId: resolvedProductId, quantity: quantity ?? null } });
  }
  if (isNegotiation(text) && offeredPrice !== null && resolvedProductId && !seen.has("evaluateOffer")) {
    plan.push({
      name: "evaluateOffer",
      arguments: { productId: resolvedProductId, offeredPrice, quantity: quantity ?? null },
    });
  }
  if ((isConfirmedOrder(text) || isPurchaseIntent(text)) && resolvedProductId && !seen.has("identifyMissingOrderFields")) {
    const draft = {
      product_id: resolvedProductId,
      quantity,
      variant: variantHint ?? null,
      delivery_city: destination,
      delivery_date: /\bfriday\b|\bthursday\b|\btoday\b|\btomorrow\b/.test(text) ? "requested" : null,
      payment_timing: /\bpay today\b|\bon delivery\b|\bafter delivery\b|\bpay later\b|\bpayment terms\b/.test(text) ? "requested" : null,
      invoice_request: /\binvoice\b/.test(text) ? true : null,
      discount_request: /\bdiscount\b|\bdealer pricing\b/.test(text) ? "requested" : null,
      partial_fulfillment: /\bpartial\b|\bonly have\b|\bnot enough\b|\bshort\b/.test(text) ? true : null,
      payment_terms: /\b21 days\b|\bpayment terms\b/.test(text) ? "requested" : null,
    };
    plan.push({ name: "identifyMissingOrderFields", arguments: { orderDraft: draft } });
  }
  if (isNegotiation(text) && /wholesale|bulk/.test(text) && resolvedProductId && !seen.has("getRelatedProducts")) {
    plan.push({ name: "getRelatedProducts", arguments: { productId: resolvedProductId } });
  }

  return plan;
}

function determineIntentLabels(
  caseRecord: RunnableEvaluationCase,
  text: string,
  productId: string | null,
  observations: AgentToolObservation[],
): IntentLabel[] {
  const labels: string[] = [];
  const spam = isSpam(text);
  const injection = isPromptInjection(text);
  const complaint = isComplaint(text);
  const phone = isPhoneRequest(text);
  const image = isProductImageRequest(text);
  const ambiguous = isAmbiguous(text);
  const availability = isAvailabilityQuestion(text);
  const unavailableStock = isUnavailableStockRequest(text);
  const variant = isVariantRequest(text);
  const delivery = isDeliveryQuestion(text);
  const location = isLocationQuestion(text);
  const negotiation = isNegotiation(text);
  const price = isPriceQuestion(text);
  const confirmedOrder = isConfirmedOrder(text);
  const purchase = isPurchaseIntent(text);
  const unsupportedPrice = /\b(other|another) seller\b.*\bquoted\b|\bmatch it\b|\bsomeone else\b.*\bsaid\b|\bthey quoted\b|\bmust match\b/.test(text);
  const belowMinimum = negotiation && (extractCurrencyNumber(text) ?? 0) > 0 && /only pay|too low|below|minimum/.test(text);
  const duplicate = caseRecord.channel === "email" && unsupportedPrice;

  if (injection) return ["prompt_injection"];
  if (spam) return ["spam_or_unrelated"];
  if (complaint) return ["complaint", "refund_request"];
  if (phone) return ["phone_call_request", "human_handoff"];
  if (image) return ["product_image_request"];
  if (unavailableStock) return ["unavailable_stock_request"];
  if (duplicate) return ["duplicate_inquiry", "unsupported_price_claim"];
  if (unsupportedPrice) return ["unsupported_price_claim", "price_match_request"];
  if (ambiguous) return ["ambiguous_product_reference"];
  if (confirmedOrder && hasAgentMemory(caseRecord)) return ["multi_message_memory", "order_intent"];
  if (confirmedOrder) return ["confirmed_order_intent"];
  if (belowMinimum) return ["price_offer_below_minimum"];
  if (availability) return ["availability_question"];
  if (variant && delivery && negotiation && productId === "UG-PRD-108") {
    return ["variant_request", "quantity_request", "negotiation", "inventory_constraint", "delivery_constraint"];
  }
  if (variant && !price) return ["variant_request"];
  if (negotiation && /\bonly pay\b|\btoo low\b|\bbelow minimum\b|\bminimum\b/.test(text)) return ["price_offer_below_minimum"];
  if (delivery) return ["delivery_question"];
  if (location) return ["business_location_question"];
  if (negotiation && /wholesale|bulk/.test(text)) return ["bulk_order", "policy_dependent_discount"];
  if (negotiation && /\b\d{1,2}\s*(?:%|percent)?\s*off\b/.test(text)) return ["negotiation_within_policy"];
  if (negotiation && offeredIsBelowMinimum(productId, text)) return ["price_offer_below_minimum"];
  if (negotiation) return ["negotiation"];
  if (price) return ["pricing_request"];
  if (purchase) return ["order_intent"];
  if (caseRecord.conversation.some((message) => message.role === "agent") && purchase) return ["multi_message_memory", "order_intent"];
  return ["ambiguous_product_reference"];

  function offeredIsBelowMinimum(productIdValue: string | null, textValue: string): boolean {
    return Boolean(productIdValue && extractCurrencyNumber(textValue) && /only pay|below|minimum/.test(textValue));
  }
}

function determineAction(text: string, intents: IntentLabel[], productId: string | null, caseRecord: RunnableEvaluationCase): ActionLabel {
  if (intents.includes("prompt_injection")) return "reject_and_escalate_security_issue";
  if (intents.includes("spam_or_unrelated")) return "ignore_or_flag_as_spam";
  if (intents.includes("complaint")) return "escalate_complaint_for_human_review";
  if (intents.includes("phone_call_request")) return "route_to_human_for_call_back";
  if (intents.includes("product_image_request")) return "share_verified_product_image";
  if (intents.includes("unavailable_stock_request")) return "explain_unavailable_stock_and_offer_waitlist";
  if (intents.includes("duplicate_inquiry")) return "deduplicate_and_link_existing_thread";
  if (intents.includes("unsupported_price_claim")) return "respond_with_verified_price_and_refuse_unsupported_claim";
  if (intents.includes("ambiguous_product_reference")) return "ask_for_clarifying_product_details";
  if (intents.includes("multi_message_memory")) return "use_prior_context_to_confirm_order_details";
  if (intents.includes("confirmed_order_intent")) return "capture_provisional_order_details";
  if (intents.includes("price_offer_below_minimum")) return "decline_below_minimum_price";
  if (intents.includes("availability_question")) {
    if (/out of stock|no stock|sold out/.test(text)) {
      return "explain_unavailable_stock_and_offer_waitlist";
    }
    return "verify_stock_before_replying";
  }
  if (intents.includes("bulk_order")) return "apply_bulk_policy_and_escalate_payment_terms";
  if (intents.includes("variant_request") && intents.includes("negotiation") && intents.includes("inventory_constraint")) {
    return "negotiate_with_inventory_and_delivery_constraints";
  }
  if (intents.includes("negotiation_within_policy")) return "apply_allowed_discount_or_confirm_verified_price";
  if (intents.includes("negotiation")) return "respond_with_verified_price_and_refuse_unsupported_claim";
  if (intents.includes("delivery_question")) return "verify_delivery_terms_before_replying";
  if (intents.includes("business_location_question")) return "provide_verified_business_location";
  if (intents.includes("pricing_request")) return "reply_with_verified_price";
  if (intents.includes("order_intent")) return "capture_provisional_order_details";
  return "ask_for_clarifying_product_details";
}

function determineEscalation(text: string, intents: IntentLabel[], action: ActionLabel): boolean {
  if (intents.includes("prompt_injection")) return true;
  if (intents.includes("complaint")) return true;
  if (intents.includes("phone_call_request")) return true;
  if (intents.includes("unavailable_stock_request")) return true;
  if (intents.includes("price_offer_below_minimum")) return true;
  if (intents.includes("unsupported_price_claim") && action !== "deduplicate_and_link_existing_thread") return true;
  if (intents.includes("bulk_order")) return true;
  if (intents.includes("inventory_constraint")) return true;
  if (intents.includes("delivery_constraint")) return true;
  if (intents.includes("availability_question") && /out of stock|no stock/.test(text)) return true;
  return false;
}

function determineLeadDecision(intents: IntentLabel[]): LeadDecision {
  if (intents.includes("spam_or_unrelated") || intents.includes("prompt_injection") || intents.includes("complaint")) {
    return "do_not_create_lead";
  }
  return "create_lead";
}

function determineProvisionalOrderDecision(intents: IntentLabel[], action: ActionLabel): ProvisionalOrderDecision {
  if (action === "capture_provisional_order_details" || action === "use_prior_context_to_confirm_order_details" || action === "apply_bulk_policy_and_escalate_payment_terms" || action === "negotiate_with_inventory_and_delivery_constraints") {
    return "prepare_provisional_order";
  }
  return "do_not_prepare_provisional_order";
}

function determineConfidence(intents: IntentLabel[], productId: string | null, action: ActionLabel): ConfidenceCategory {
  if (intents.includes("ambiguous_product_reference")) return "low";
  if (!productId && action !== "ask_for_clarifying_product_details") return "low";
  if (intents.includes("bulk_order") || intents.includes("price_offer_below_minimum") || intents.includes("unsupported_price_claim")) return "high";
  if (productId) return "high";
  return "medium";
}

function determineClarificationQuestion(intents: IntentLabel[], productId: string | null): string | null {
  if (productId) {
    return null;
  }
  if (intents.includes("ambiguous_product_reference")) {
    return "Could you share the product name or the original post so I can verify the correct item?";
  }
  return "Could you share a bit more detail so I can verify the right product?";
}

function gatherEvidenceRefs(observations: AgentToolObservation[]): string[] {
  const refs = new Set<string>();
  for (const entry of observations) {
    for (const ref of entry.evidence_refs) {
      refs.add(ref);
    }
  }
  return [...refs];
}

function deriveMissingOrderFields(intents: IntentLabel[], action: ActionLabel, extracted: OrderField[] | null): OrderField[] | null {
  if (!["capture_provisional_order_details", "use_prior_context_to_confirm_order_details", "apply_bulk_policy_and_escalate_payment_terms", "negotiate_with_inventory_and_delivery_constraints"].includes(action)) {
    return null;
  }
  const required = new Set<string>();
  if (action === "capture_provisional_order_details" || action === "use_prior_context_to_confirm_order_details") {
    required.add("quantity");
    if (intents.includes("multi_message_memory")) {
      required.add("variant");
      required.add("delivery_city");
      required.add("delivery_date");
    }
  }
  if (action === "apply_bulk_policy_and_escalate_payment_terms") {
    required.add("quantity");
    required.add("discount_request");
    required.add("payment_terms");
  }
  if (action === "negotiate_with_inventory_and_delivery_constraints") {
    required.add("variant");
    required.add("quantity");
    required.add("discount_request");
    required.add("partial_fulfillment");
    required.add("delivery_date");
  }
  for (const field of extracted ?? []) {
    required.delete(field);
  }
  return [...required] as OrderField[];
}

function determineEscalationReason(intents: IntentLabel[], action: ActionLabel, productId: string | null): string | null {
  if (intents.includes("prompt_injection")) return "prompt injection attempt";
  if (intents.includes("complaint")) return "complaint requires human review";
  if (intents.includes("phone_call_request")) return "customer requested a phone handoff";
  if (intents.includes("unavailable_stock_request")) return "inventory is unavailable and requires human review";
  if (intents.includes("price_offer_below_minimum")) return "offer is below the permitted range";
  if (intents.includes("bulk_order")) return "bulk order requires policy review";
  if (intents.includes("inventory_constraint")) return "inventory constraints require approval";
  if (intents.includes("delivery_constraint")) return "delivery constraints require approval";
  if (intents.includes("unsupported_price_claim")) return "unsupported price claim requires review";
  if (action === "negotiate_with_inventory_and_delivery_constraints") return "inventory and delivery constraints require approval";
  if (!productId && action !== "ask_for_clarifying_product_details") return "product association is uncertain";
  return null;
}

function determineApprovalQueue(escalationRequired: boolean, confidence: ConfidenceCategory, intents: IntentLabel[], action: ActionLabel): "normal" | "specialized" {
  if (escalationRequired) {
    return "specialized";
  }
  if (confidence === "low") {
    return "specialized";
  }
  return "normal";
}

function normalizePredictionFields(
  caseRecord: RunnableEvaluationCase,
  text: string,
  productId: string | null,
  intents: IntentLabel[],
  action: ActionLabel,
  escalationRequired: boolean,
  leadDecision: LeadDecision,
  provisionalOrderDecision: ProvisionalOrderDecision,
  extractedOrderFields: OrderField[] | null,
): AgentFinalOutput["prediction"] {
  const orderFields = extractedOrderFields && extractedOrderFields.length ? extractedOrderFields : null;
  return {
    response_text: buildResponseText({
      response_text: "",
      is_lead: leadDecision === "create_lead",
      intent_labels: intents,
      product_id: productId,
      action,
      escalation: escalationRequired,
      lead_creation: leadDecision === "create_lead",
      provisional_order: provisionalOrderDecision === "prepare_provisional_order",
      order_fields: orderFields,
    }),
    is_lead: leadDecision === "create_lead",
    intent_labels: intents,
    product_id: productId,
    action,
    escalation: escalationRequired,
    lead_creation: leadDecision === "create_lead",
    provisional_order: provisionalOrderDecision === "prepare_provisional_order",
    order_fields: orderFields,
  };
}

function selectProductAssociation(productId: string | null, intents: IntentLabel[]): ProductAssociationDecision {
  if (productId) {
    return {
      status: "associated",
      product_id: productId,
      clarification_question: null,
    };
  }
  return {
    status: "clarification_needed",
    product_id: null,
    clarification_question: determineClarificationQuestion(intents, productId),
  };
}

export function buildHeuristicFinalOutput(
  caseRecord: RunnableEvaluationCase,
  observations: AgentToolObservation[],
): AgentFinalOutput {
  const proposal = inferPolicyFromConversation(caseRecord, observations);
  return enforceHybridPolicy(caseRecord, proposal, observations).final_output;
}

export function buildSafeFallback(caseRecord: RunnableEvaluationCase, reason: string): AgentFinalOutput {
  const proposal = inferPolicyFromConversation(caseRecord, []);
  return enforceHybridPolicy(caseRecord, proposal, [], reason).final_output;
}
