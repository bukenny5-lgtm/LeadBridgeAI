import type { ConversationMessage } from "../shared/types.js";
import type { Prediction, RunnableEvaluationCase } from "../evaluation/case-schema.js";
import type { ActionLabel, IntentLabel, OrderField } from "../evaluation/canonical-contract.js";

type TextPattern = string | RegExp;

const BUYING_PATTERNS: TextPattern[] = [
  /\bprice\b/,
  /\bhow much\b/,
  /\bquote\b/,
  /\brate\b/,
  /\btotal\b/,
  /\bhm\b/,
  /\bcost\b/,
];

const AVAILABILITY_PATTERNS: TextPattern[] = [
  /\bavailable\b/,
  /\bstill available\b/,
  /\bin stock\b/,
  /\bany left\b/,
  /\brestock\b/,
  /\brestocked\b/,
  /\brestocking\b/,
];

const PURCHASE_PATTERNS: TextPattern[] = [
  /\bi want\b/,
  /\bi ll take it\b/,
  /\bi ll take\b/,
  /\bill take it\b/,
  /\breserve\b/,
  /\bbook\b/,
  /\bmine\b/,
  /\bcheckout\b/,
  /\bsend the invoice\b/,
  /\bplace the order\b/,
];

const VARIANT_PATTERNS: TextPattern[] = [
  /\bsize\b/,
  /\bcolour\b/,
  /\bcolor\b/,
  /\bflavour\b/,
  /\bflavor\b/,
  /\bdesign\b/,
  /\bpack size\b/,
];

const MEDIA_PATTERNS: TextPattern[] = [
  /\bmore photos?\b/,
  /\bpictures?\b/,
  /\bvideo\b/,
  /\bcatalogue\b/,
  /\bcatalog\b/,
  /\bsimilar products?\b/,
];

const DELIVERY_PATTERNS: TextPattern[] = [
  /\bdeliver\b/,
  /\bship\b/,
  /\bcourier\b/,
  /\bdelivery fee\b/,
  /\barrival\b/,
];

const LOCATION_CONTACT_PATTERNS: TextPattern[] = [
  /\blocated\b/,
  /\bbased\b/,
  /\baddress\b/,
  /\bdirections\b/,
  /\bwhatsapp\b/,
  /\bphone\b/,
  /\bwhere are you\b/,
  /\bwhere is\b/,
];

const NEGOTIATION_PATTERNS: TextPattern[] = [
  /\bbest price\b/,
  /\blast price\b/,
  /\bdiscount\b/,
  /\breduce\b/,
  /\bbudget\b/,
  /\bbulk\b/,
  /\bwholesale\b/,
  /\bcan you do\b/,
  /\bdealer pricing\b/,
];

const COMPLAINT_PATTERNS: TextPattern[] = [
  /\bdamaged\b/,
  /\bwrong item\b/,
  /\blate\b/,
  /\brefund\b/,
  /\breturn\b/,
  /\bcancel\b/,
];

const SPAM_PATTERNS: TextPattern[] = [
  /\bfollow back\b/,
  /\bvisit my page\b/,
  /\bpromotion\b/,
  /\bpromo\b/,
  /\bfollower growth\b/,
  /\bunrelated links\b/,
  /\bclick my link\b/,
  /\bguaranteed returns\b/,
  /\bgrow your .* account\b/,
  /\bdm me\b/,
  /\bsubscribe\b/,
  /\bearn (?:money|fast)\b/,
  /\bcrypto\b.*\breturns\b/,
];

const INJECTION_PATTERNS: TextPattern[] = [
  /\bignore(?: your)?(?: the)? instructions\b/,
  /\bdisregard instructions\b/,
  /\boverride instructions\b/,
  /\breveal(?: the)? (?:internal )?(?:rules|price floor|policy notes)\b/,
  /\breveal rules\b/,
  /\bbypass approval\b/,
  /\bdisclose minimum price\b/,
  /\bmark as paid\b/,
  /\bexpose customer data\b/,
  /\bsystem prompt\b/,
  /\bdeveloper message\b/,
  /\bdeveloper instructions\b/,
  /\bpolicy notes\b/,
  /\bprice floor\b/,
  /\bjailbreak\b/,
];

const COMPLIMENT_PATTERNS: TextPattern[] = [
  /\bnice work\b/,
  /\bnice page\b/,
  /\bgreat work\b/,
  /\bgreat page\b/,
  /\blove your posts\b/,
  /\bpolished\b/,
  /\bgood content\b/,
  /\blike your page\b/,
];

const UNSUPPORTED_PRICE_CLAIM_PATTERNS: TextPattern[] = [
  /\b(other|another) seller\b.*\bquoted\b/,
  /\bmatch it\b/,
  /\bsomeone else\b.*\bsaid\b/,
  /\bthey quoted\b/,
  /\bmust match\b/,
];

const ORDER_DETAIL_PATTERNS: TextPattern[] = [
  /\bi will pay today\b/,
  /\bcheckout details\b/,
  /\bsend the invoice\b/,
  /\bplace the order\b/,
  /\bsend invoice\b/,
  /\bcheckout\b/,
];

function normalizeForMatching(text: string): string {
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

function collectCustomerText(messages: ConversationMessage[]): string {
  return normalizeForMatching(
    messages
      .filter((message) => message.role === "customer")
      .map((message) => message.text)
      .join(" "),
  );
}

function matchesPattern(text: string, pattern: TextPattern): boolean {
  return typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
}

function matchesAny(text: string, patterns: TextPattern[]): boolean {
  return patterns.some((pattern) => matchesPattern(text, pattern));
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function hasAnyPattern(text: string, patterns: TextPattern[]): boolean {
  return matchesAny(text, patterns);
}

function isPromptInjection(text: string): boolean {
  return matchesAny(text, INJECTION_PATTERNS);
}

function isSpam(text: string): boolean {
  return matchesAny(text, SPAM_PATTERNS);
}

function isComplimentOnly(text: string): boolean {
  return (
    matchesAny(text, COMPLIMENT_PATTERNS) &&
    !isPriceQuestion(text) &&
    !isAvailabilityQuestion(text) &&
    !isPurchaseIntent(text) &&
    !isVariantRequest(text) &&
    !isMediaRequest(text) &&
    !isLocationQuestion(text) &&
    !isDeliveryQuestion(text) &&
    !isNegotiation(text)
  );
}

function isComplaint(text: string): boolean {
  return matchesAny(text, COMPLAINT_PATTERNS);
}

function isPhoneRequest(text: string): boolean {
  return /\b(call me|call back|phone me|ring me|by phone|phone call)\b/.test(text);
}

function isAmbiguous(text: string): boolean {
  return /\b(same one|last post|this one|that one|same thing|which one)\b/.test(text);
}

function isPriceQuestion(text: string): boolean {
  const directPriceCue = /\b(price|how much|quote|rate|total|hm)\b/.test(text);
  if (directPriceCue) {
    return true;
  }
  if (!/\bcost\b/.test(text)) {
    return false;
  }
  return !isDeliveryQuestion(text);
}

function isAvailabilityQuestion(text: string): boolean {
  return matchesAny(text, AVAILABILITY_PATTERNS);
}

function hasSufficientPurchaseContext(text: string): boolean {
  return (
    /\b\d+\b/.test(text) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/.test(
      text,
    ) ||
    /\b(quantity|units?|packs?|pieces?|items?|sets?)\b/.test(text) ||
    /\b(for pickup|for collection|to deliver|deliver to|checkout|invoice|order)\b/.test(text)
  );
}

function isPurchaseIntent(text: string): boolean {
  if (matchesAny(text, PURCHASE_PATTERNS)) {
    return true;
  }
  if (/\bi need\b/.test(text) || /\bneed\b/.test(text)) {
    return hasSufficientPurchaseContext(text);
  }
  return false;
}

function isVariantRequest(text: string): boolean {
  return /\b(colour|color|size|design|flavour|flavor)\b/.test(text) || /\bpack size\b/.test(text);
}

function isMediaRequest(text: string): boolean {
  return matchesAny(text, MEDIA_PATTERNS);
}

function isLocationQuestion(text: string): boolean {
  if (matchesAny(text, LOCATION_CONTACT_PATTERNS)) {
    return true;
  }
  if (/\bpickup\b/.test(text) || /\bcollection\b/.test(text)) {
    return /\bwhere\b|\bbased\b|\blocated\b|\baddress\b|\bdirections\b/.test(text);
  }
  return false;
}

function isDeliveryQuestion(text: string): boolean {
  if (matchesAny(text, DELIVERY_PATTERNS)) {
    return true;
  }
  if (/\bpickup\b|\bcollection\b/.test(text)) {
    return !isLocationQuestion(text);
  }
  return false;
}

function isNegotiation(text: string): boolean {
  return matchesAny(text, NEGOTIATION_PATTERNS);
}

function isUnsupportedPriceClaim(text: string): boolean {
  return matchesAny(text, UNSUPPORTED_PRICE_CLAIM_PATTERNS);
}

function isConfirmedOrder(text: string): boolean {
  return matchesAny(text, ORDER_DETAIL_PATTERNS) || /\border\s+\d+\b/.test(text);
}

function shouldEscalate(text: string): boolean {
  return (
    isComplaint(text) ||
    isPhoneRequest(text) ||
    isPromptInjection(text) ||
    isUnsupportedPriceClaim(text) ||
    (isNegotiation(text) && (/\bcredit\b/.test(text) || /\bdays to pay\b/.test(text))) ||
    /\brefund\b/.test(text) ||
    /\bout of stock\b/.test(text) ||
    /\bi only pay\b/.test(text) ||
    /\bpay after delivery\b/.test(text) ||
    /\bpayment terms\b/.test(text) ||
    /\bbelow\b.*\bminimum\b/.test(text)
  );
}

function inferLead(text: string): boolean {
  return (
    !isSpam(text) &&
    !isComplaint(text) &&
    !isPhoneRequest(text) &&
    !isPromptInjection(text) &&
    !isComplimentOnly(text)
  );
}

function inferIntentLabels(text: string): IntentLabel[] {
  const labels: IntentLabel[] = [];
  const spam = isSpam(text);
  const complaint = !spam && isComplaint(text);
  const phone = !spam && !complaint && isPhoneRequest(text);
  const injection = isPromptInjection(text);
  const complement = isComplimentOnly(text);
  const ambiguous = !spam && !complaint && !phone && !injection && isAmbiguous(text);
  const availability = !spam && !complaint && !phone && !injection && isAvailabilityQuestion(text);
  const media = !spam && !complaint && !phone && !injection && isMediaRequest(text);
  const variant = !spam && !complaint && !phone && !injection && isVariantRequest(text);
  const location = !spam && !complaint && !phone && !injection && isLocationQuestion(text);
  const delivery = !spam && !complaint && !phone && !injection && isDeliveryQuestion(text);
  const negotiation = !spam && !complaint && !phone && !injection && isNegotiation(text);
  const price = !spam && !complaint && !phone && !injection && isPriceQuestion(text);
  const confirmedOrder = !spam && !complaint && !phone && !injection && isConfirmedOrder(text);
  const purchaseIntent = !spam && !complaint && !phone && !injection && !confirmedOrder && isPurchaseIntent(text);

  if (injection) {
    labels.push("prompt_injection");
    return labels;
  }
  if (spam) {
    labels.push("spam_or_unrelated");
    return labels;
  }
  if (complaint) {
    labels.push("complaint", "refund_request");
    return labels;
  }
  if (phone) {
    labels.push("phone_call_request", "human_handoff");
    return labels;
  }
  if (complement) {
    labels.push("compliment_only");
  }
  if (isUnsupportedPriceClaim(text)) {
    labels.push("unsupported_price_claim", "price_match_request");
  }
  if (ambiguous) {
    labels.push("ambiguous_product_reference");
  }
  if (confirmedOrder) {
    labels.push("confirmed_order_intent");
  }
  if (purchaseIntent) {
    labels.push("order_intent");
  }
  if (negotiation) {
    labels.push("negotiation");
  }
  if (availability) {
    labels.push("availability_question");
  }
  if (media) {
    labels.push("product_image_request");
  }
  if (variant) {
    labels.push("variant_request");
  }
  if (location) {
    labels.push("business_location_question");
  }
  if (delivery) {
    labels.push("delivery_question");
  }
  if (price) {
    labels.push("pricing_request");
  }
  if (inferLead(text) && labels.length === 0) {
    labels.push("ambiguous_product_reference");
  }
  return uniqueStrings(labels);
}

function inferAction(text: string): ActionLabel {
  if (isSpam(text)) {
    return "ignore_or_flag_as_spam";
  }
  if (isComplimentOnly(text)) {
    return "thank_without_lead_creation";
  }
  if (isPromptInjection(text)) {
    return "reject_and_escalate_security_issue";
  }
  if (isComplaint(text)) {
    return "escalate_complaint_for_human_review";
  }
  if (isPhoneRequest(text)) {
    return "route_to_human_for_call_back";
  }
  if (isUnsupportedPriceClaim(text)) {
    return "respond_with_verified_price_and_refuse_unsupported_claim";
  }
  if (isAmbiguous(text)) {
    return "ask_for_clarifying_product_details";
  }
  if (isConfirmedOrder(text) || isPurchaseIntent(text)) {
    return "capture_provisional_order_details";
  }
  if (isNegotiation(text) && /\bwholesale\b/.test(text)) {
    return "apply_bulk_policy_and_escalate_payment_terms";
  }
  if (isNegotiation(text) && /\bdelivery\b/.test(text)) {
    return "negotiate_with_inventory_and_delivery_constraints";
  }
  if (isNegotiation(text)) {
    return "respond_with_verified_price_and_refuse_unsupported_claim";
  }
  if (isAvailabilityQuestion(text)) {
    return "verify_stock_before_replying";
  }
  if (isVariantRequest(text)) {
    return "ask_for_clarifying_product_details";
  }
  if (isMediaRequest(text)) {
    return "share_verified_product_image";
  }
  if (isLocationQuestion(text)) {
    return "provide_verified_business_location";
  }
  if (isDeliveryQuestion(text)) {
    return "verify_delivery_terms_before_replying";
  }
  if (isPriceQuestion(text)) {
    return "reply_with_verified_price";
  }
  return "ask_for_clarifying_product_details";
}

function inferProductId(_text: string): string | null {
  return null;
}

function extractOrderFields(text: string): OrderField[] | null {
  const fields = new Set<OrderField>();
  if (/\b\d+\b/.test(text) || /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/.test(text)) {
    fields.add("quantity");
  }
  if (/\b(blue|green|red|navy|size|colour|color|flavour|flavor|design)\b/.test(text)) {
    fields.add("variant");
  }
  if (/\b(kampala|mukono|jinja|entebbe|wakiso|pickup|collection)\b/.test(text)) {
    fields.add("delivery_city");
  }
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|arrival)\b/.test(text)) {
    fields.add("delivery_date");
  }
  if (/\b(pay today|after delivery|on delivery|pay later|payment terms)\b/.test(text)) {
    fields.add("payment_timing");
  }
  if (/\binvoice\b/.test(text)) {
    fields.add("invoice_request");
  }
  if (!fields.size) {
    return null;
  }
  return [...fields];
}

function groundedResponseText(prediction: Prediction): string {
  if (prediction.escalation) {
    return "Thanks for reaching out. This needs human review before a reply is sent.";
  }
  if (!prediction.is_lead) {
    return "Thanks for the message.";
  }
  if (prediction.provisional_order) {
    return "Thanks. I have the details for a draft order and will send it for approval.";
  }
  return "Thanks for reaching out. I will verify the request and prepare a draft for approval.";
}

export function runDeterministicBaseline(caseRecord: RunnableEvaluationCase): Prediction {
  const text = collectCustomerText(caseRecord.conversation);
  const isLead = inferLead(text);
  const intentLabels = inferIntentLabels(text);
  const action = inferAction(text);
  const escalation = shouldEscalate(text);
  const provisionalOrder = action === "capture_provisional_order_details";
  const orderFields = provisionalOrder ? extractOrderFields(text) : null;

  const prediction: Prediction = {
    response_text: groundedResponseText({
      response_text: "",
      is_lead: isLead,
      intent_labels: intentLabels,
      product_id: inferProductId(text),
      action,
      escalation,
      lead_creation: isLead,
      provisional_order: provisionalOrder,
      order_fields: orderFields,
    }),
    is_lead: isLead,
    intent_labels: intentLabels,
    product_id: inferProductId(text),
    action,
    escalation,
    lead_creation: isLead,
    provisional_order: provisionalOrder,
    order_fields: orderFields,
  };

  return prediction;
}
