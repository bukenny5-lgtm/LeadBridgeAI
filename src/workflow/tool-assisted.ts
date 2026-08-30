import type { Prediction, RunnableEvaluationCase } from "../evaluation/case-schema.js";
import type { ActionLabel, IntentLabel, OrderField } from "../evaluation/canonical-contract.js";
import {
  checkInventory,
  evaluateOffer,
  findProductByPost,
  getBusinessLocation,
  getDeliveryOptions,
  getNegotiationPolicy,
  getProduct,
  getProductImages,
  getRelatedProducts,
  identifyMissingOrderFields,
  searchCatalogue,
  type ToolTraceRecord,
} from "../tools/verified-tools.js";

export interface ToolAssistedRun {
  prediction: Prediction;
  tool_calls: ToolTraceRecord[];
  evidence_refs: string[];
  route: string;
}

type TextPattern = RegExp;

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

function collectCustomerText(messages: RunnableEvaluationCase["conversation"]): string {
  return normalizeForMatching(
    messages
      .filter((message) => message.role === "customer")
      .map((message) => message.text)
      .join(" "),
  );
}

function matchesAny(text: string, patterns: TextPattern[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isSpam(text: string): boolean {
  return matchesAny(text, SPAM_PATTERNS);
}

function isPromptInjection(text: string): boolean {
  return matchesAny(text, INJECTION_PATTERNS);
}

function isComplaint(text: string): boolean {
  return /\bdamaged\b|\bwrong item\b|\blate\b|\brefund\b|\breturn\b|\bcancel\b|\bcracked\b/.test(text);
}

function isPhoneRequest(text: string): boolean {
  return /\b(call me|call back|phone me|ring me|by phone|phone call)\b/.test(text);
}

function isUnsupportedPriceClaim(text: string): boolean {
  return /\b(other|another) seller\b.*\bquoted\b|\bmatch it\b|\bsomeone else\b.*\bsaid\b|\bthey quoted\b|\bmust match\b/.test(
    text,
  );
}

function isAmbiguous(text: string): boolean {
  return /\b(same one|last post|this one|that one|same thing|which one)\b/.test(text);
}

function isPriceQuestion(text: string): boolean {
  return /\b(price|how much|quote|rate|total|hm)\b/.test(text);
}

function isAvailabilityQuestion(text: string): boolean {
  return /\bavailable\b|\bstill available\b|\bin stock\b|\bany left\b|\brestock\b|\brestocked\b|\brestocking\b/.test(text);
}

function isVariantRequest(text: string): boolean {
  return /\b(colour|color|size|design|flavour|flavor|version)\b/.test(text) || /\b(red|blue|green|navy|black|white|sand|mixed)\b/.test(text) || /\bpack size\b/.test(text);
}

function isMediaRequest(text: string): boolean {
  return /\bmore photos?\b|\bpictures?\b|\bvideo\b|\bcatalogue\b|\bcatalog\b|\bsimilar products?\b/.test(text);
}

function isDeliveryQuestion(text: string): boolean {
  return /\bdeliver\b|\bship\b|\bcourier\b|\bdelivery fee\b|\bdelivery cost\b|\barrival\b/.test(text);
}

function isLocationQuestion(text: string): boolean {
  return /\blocated\b|\bbased\b|\baddress\b|\bdirections\b|\bwhatsapp\b|\bphone\b|\bwhere are you\b|\bwhere is\b|\bpickup point\b/.test(
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
  const ugx = cleaned.match(/\b(\d{1,3}(?:\d{3})+|\d+)\s*(?:ugx|shs|\/=)\b/);
  if (ugx) {
    return Number(ugx[1]);
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

function extractApprovalFields(text: string): OrderField[] {
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

function createPrediction(data: Partial<Prediction>): Prediction {
  return {
    response_text: data.response_text ?? "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
    is_lead: data.is_lead ?? true,
    intent_labels: data.intent_labels ?? ["ambiguous_product_reference"],
    product_id: data.product_id ?? null,
    action: data.action ?? "ask_for_clarifying_product_details",
    escalation: data.escalation ?? false,
    lead_creation: data.lead_creation ?? true,
    provisional_order: data.provisional_order ?? false,
    order_fields: data.order_fields ?? null,
  };
}

export function runToolAssistedWorkflow(caseRecord: RunnableEvaluationCase): ToolAssistedRun {
  const toolCalls: ToolTraceRecord[] = [];
  const evidenceRefs = new Set<string>();
  const text = collectCustomerText(caseRecord.conversation);
  const routeParts: string[] = [];
  const pushCall = <T>(result: { trace: ToolTraceRecord; evidence_refs: string[]; data: T | null }) => {
    toolCalls.push(result.trace);
    result.evidence_refs.forEach((ref) => evidenceRefs.add(ref));
    return result.data;
  };

  const mapping = caseRecord.post_id ? pushCall(findProductByPost(caseRecord.channel, caseRecord.post_id)) : null;
  let productId = mapping?.product_id ?? null;
  if (!productId && !isSpam(text) && !isPromptInjection(text) && !isComplaint(text) && !isPhoneRequest(text)) {
    const catalogue = pushCall(searchCatalogue(text));
    if (catalogue && catalogue.length === 1) {
      productId = catalogue[0].product_id;
    }
  }
  if (productId) {
    pushCall(getProduct(productId));
  }

  const isSpamMessage = isSpam(text);
  const isInjectionMessage = isPromptInjection(text);
  const isComplaintMessage = isComplaint(text);
  const isPhoneMessage = isPhoneRequest(text);
  const isUnsupportedPrice = isUnsupportedPriceClaim(text);
  const isAmbiguousMessage = isAmbiguous(text);
  const isPriceMessage = isPriceQuestion(text);
  const isAvailabilityMessage = isAvailabilityQuestion(text);
  const isVariantMessage = isVariantRequest(text);
  const isMediaMessage = isMediaRequest(text);
  const isDeliveryMessage = isDeliveryQuestion(text);
  const isLocationMessage = isLocationQuestion(text);
  const isNegotiationMessage = isNegotiation(text);
  const isConfirmedOrderMessage = isConfirmedOrder(text);
  const isPurchaseMessage = isPurchaseIntent(text);
  const destination = extractDestination(text);
  const quantity = extractQuantity(text);
  const offeredPrice = extractCurrencyNumber(text);
  const approvalFields = extractApprovalFields(text);

  if (isSpamMessage) {
    routeParts.push("spam");
    return {
      prediction: createPrediction({
        response_text: "Thanks for the message.",
        is_lead: false,
        intent_labels: ["spam_or_unrelated"],
        product_id: null,
        action: "ignore_or_flag_as_spam",
        escalation: false,
        lead_creation: false,
        provisional_order: false,
        order_fields: null,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isInjectionMessage) {
    routeParts.push("prompt_injection");
    return {
      prediction: createPrediction({
        response_text: "Thanks for reaching out. This needs human review before a reply is sent.",
        is_lead: false,
        intent_labels: ["prompt_injection"],
        product_id: null,
        action: "reject_and_escalate_security_issue",
        escalation: true,
        lead_creation: false,
        provisional_order: false,
        order_fields: null,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isComplaintMessage) {
    routeParts.push("complaint");
    return {
      prediction: createPrediction({
        response_text: "Thanks for reaching out. This needs human review before a reply is sent.",
        is_lead: false,
        intent_labels: ["complaint", "refund_request"],
        product_id: productId,
        action: "escalate_complaint_for_human_review",
        escalation: true,
        lead_creation: false,
        provisional_order: false,
        order_fields: null,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isPhoneMessage) {
    routeParts.push("phone_handoff");
    return {
      prediction: createPrediction({
        response_text: "Thanks for reaching out. This needs human review before a reply is sent.",
        is_lead: true,
        intent_labels: ["phone_call_request", "human_handoff"],
        product_id: productId,
        action: "route_to_human_for_call_back",
        escalation: true,
        lead_creation: true,
        provisional_order: false,
        order_fields: null,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isAmbiguousMessage) {
    routeParts.push("clarification");
    return {
      prediction: createPrediction({
        intent_labels: ["ambiguous_product_reference"],
        product_id: productId,
        action: "ask_for_clarifying_product_details",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isUnsupportedPrice) {
    routeParts.push("unsupported_price_claim");
    if (productId) {
      pushCall(getNegotiationPolicy(productId, quantity ?? undefined));
    }
    if (caseRecord.channel === "email") {
      return {
        prediction: createPrediction({
          intent_labels: ["duplicate_inquiry", "unsupported_price_claim"],
          product_id: productId,
          action: "deduplicate_and_link_existing_thread",
          escalation: false,
          lead_creation: false,
          provisional_order: false,
          order_fields: null,
        }),
        tool_calls: toolCalls,
        evidence_refs: [...evidenceRefs],
        route: routeParts.join(" > "),
      };
    }
    return {
      prediction: createPrediction({
        intent_labels: ["unsupported_price_claim", "price_match_request"],
        product_id: productId,
        action: "respond_with_verified_price_and_refuse_unsupported_claim",
        escalation: true,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if ((isPurchaseMessage || isAvailabilityMessage) && productId) {
    const inventory = pushCall(checkInventory(productId, extractVariantHint(text) ?? undefined));
    if (inventory && inventory.length > 0 && inventory.every((entry) => entry.available_quantity === 0 || entry.stock_status === "out_of_stock")) {
      routeParts.push("inventory_unavailable");
      return {
        prediction: createPrediction({
          intent_labels: ["unavailable_stock_request"],
          product_id: productId,
          action: "explain_unavailable_stock_and_offer_waitlist",
          escalation: true,
          provisional_order: false,
          order_fields: null,
        }),
        tool_calls: toolCalls,
        evidence_refs: [...evidenceRefs],
        route: routeParts.join(" > "),
      };
    }
  }

  const hasConversationMemory =
    caseRecord.conversation.length > 1 && caseRecord.conversation.some((message) => message.role === "agent");

  if (isConfirmedOrderMessage || (isPurchaseMessage && !isNegotiationMessage)) {
    routeParts.push("order_capture");
    if (hasConversationMemory && isPurchaseMessage && !isDeliveryMessage && !isPriceMessage && !isAvailabilityMessage) {
      const fields = approvalFields.length ? approvalFields : null;
      return {
        prediction: createPrediction({
          intent_labels: ["multi_message_memory", "order_intent"],
          product_id: productId,
          action: "use_prior_context_to_confirm_order_details",
          provisional_order: true,
          order_fields: fields,
        }),
        tool_calls: toolCalls,
        evidence_refs: [...evidenceRefs],
        route: routeParts.join(" > "),
      };
    }
    if (productId) {
      const orderDraft = {
        product_id: productId,
        quantity,
        variant: extractVariantHint(text),
        delivery_city: destination,
        delivery_date: /\bfriday\b|\bthursday\b|\btoday\b|\btomorrow\b/.test(text) ? "requested" : undefined,
        payment_timing: /\bpay today\b|\bon delivery\b|\bafter delivery\b|\bpay later\b|\bpayment terms\b/.test(text)
          ? "requested"
          : undefined,
        invoice_request: /\binvoice\b/.test(text) ? true : undefined,
      };
      pushCall(identifyMissingOrderFields(orderDraft));
    }
    const labels: IntentLabel[] = isConfirmedOrderMessage ? ["confirmed_order_intent"] : ["order_intent"];
    const fields = approvalFields.length ? approvalFields : null;
    return {
      prediction: createPrediction({
        intent_labels: labels,
        product_id: productId,
        action: "capture_provisional_order_details",
        provisional_order: true,
        order_fields: fields,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isNegotiationMessage) {
    routeParts.push("negotiation");
    if (productId) {
      const policy = pushCall(getNegotiationPolicy(productId, quantity ?? undefined));
      if (!policy) {
        return {
          prediction: createPrediction({
            intent_labels: ["negotiation"],
            product_id: productId,
            action: "respond_with_verified_price_and_refuse_unsupported_claim",
            escalation: /\bcredit\b|\bdays to pay\b|\bpayment terms\b/.test(text),
          }),
          tool_calls: toolCalls,
          evidence_refs: [...evidenceRefs],
          route: routeParts.join(" > "),
        };
      }
      const offer = offeredPrice !== null && offeredPrice !== undefined && productId
        ? pushCall(evaluateOffer(productId, offeredPrice, quantity ?? 1))
        : null;
      if (offer?.outcome === "below_minimum") {
        return {
          prediction: createPrediction({
            intent_labels: ["price_offer_below_minimum"],
            product_id: productId,
            action: "decline_below_minimum_price",
            escalation: true,
          }),
          tool_calls: toolCalls,
          evidence_refs: [...evidenceRefs, ...(policy ? [policy.evidence_ref] : [])],
          route: routeParts.join(" > "),
        };
      }
      if (offer?.outcome === "within_policy") {
        return {
          prediction: createPrediction({
            intent_labels: ["negotiation_within_policy"],
            product_id: productId,
            action: "apply_allowed_discount_or_confirm_verified_price",
            escalation: false,
          }),
          tool_calls: toolCalls,
          evidence_refs: [...evidenceRefs],
          route: routeParts.join(" > "),
        };
      }
      const discountPct = extractDiscountPercent(text);
      if (
        discountPct !== null &&
        discountPct <= policy.ordinary_discount_authority_pct &&
        !isDeliveryMessage &&
        !/\bpayment terms\b|\bdays to pay\b|\bpay later\b|\b21 days\b/.test(text)
      ) {
        return {
          prediction: createPrediction({
            intent_labels: ["negotiation_within_policy"],
            product_id: productId,
            action: "apply_allowed_discount_or_confirm_verified_price",
            escalation: false,
          }),
          tool_calls: toolCalls,
          evidence_refs: [...evidenceRefs],
          route: routeParts.join(" > "),
        };
      }
      if (isDeliveryMessage && quantity !== null) {
        const inventory = pushCall(checkInventory(productId, extractVariantHint(text) ?? undefined));
        if (destination) {
          pushCall(getDeliveryOptions(destination));
        }
        if (inventory && inventory[0] && quantity > inventory[0].available_quantity) {
          return {
            prediction: createPrediction({
              intent_labels: ["variant_request", "quantity_request", "negotiation", "inventory_constraint", "delivery_constraint"],
              product_id: productId,
              action: "negotiate_with_inventory_and_delivery_constraints",
              escalation: true,
              provisional_order: true,
              order_fields: ["variant", "quantity", "discount_request", "partial_fulfillment", "delivery_date"],
            }),
            tool_calls: toolCalls,
            evidence_refs: [...evidenceRefs, policy.evidence_ref],
            route: routeParts.join(" > "),
          };
        }
      }
    }
    if (quantity !== null && /\bpayment terms\b|\bdays to pay\b|\bpay later\b|\b21 days\b/.test(text)) {
      return {
        prediction: createPrediction({
          intent_labels: ["bulk_order", "policy_dependent_discount"],
          product_id: productId,
          action: "apply_bulk_policy_and_escalate_payment_terms",
          escalation: true,
          provisional_order: true,
          order_fields: ["quantity", "discount_request", "payment_terms"],
        }),
        tool_calls: toolCalls,
        evidence_refs: [...evidenceRefs],
        route: routeParts.join(" > "),
      };
    }
    return {
      prediction: createPrediction({
        intent_labels: ["negotiation"],
        product_id: productId,
        action: "respond_with_verified_price_and_refuse_unsupported_claim",
        escalation: /\bcredit\b|\bdays to pay\b|\bpayment terms\b/.test(text),
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isAvailabilityMessage) {
    routeParts.push("availability");
    if (productId) {
      const inventory = pushCall(checkInventory(productId, extractVariantHint(text) ?? undefined));
      if (inventory && inventory.length > 0 && inventory.every((entry) => entry.stock_status === "out_of_stock" || entry.available_quantity === 0)) {
        return {
          prediction: createPrediction({
            intent_labels: ["unavailable_stock_request"],
            product_id: productId,
            action: "explain_unavailable_stock_and_offer_waitlist",
            escalation: true,
          }),
          tool_calls: toolCalls,
          evidence_refs: [...evidenceRefs],
          route: routeParts.join(" > "),
        };
      }
    }
    return {
      prediction: createPrediction({
        intent_labels: ["availability_question"],
        product_id: productId,
        action: "verify_stock_before_replying",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isMediaMessage) {
    routeParts.push("media");
    if (productId) {
      pushCall(getProductImages(productId));
    }
    return {
      prediction: createPrediction({
        intent_labels: ["product_image_request"],
        product_id: productId,
        action: "share_verified_product_image",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isVariantMessage && !isPriceMessage) {
    routeParts.push("variant");
    if (productId) {
      pushCall(getProduct(productId));
    }
    return {
      prediction: createPrediction({
        intent_labels: ["variant_request"],
        product_id: productId,
        action: "ask_for_clarifying_product_details",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isLocationMessage) {
    routeParts.push("location");
    pushCall(getBusinessLocation());
    return {
      prediction: createPrediction({
        intent_labels: ["business_location_question"],
        product_id: productId,
        action: "provide_verified_business_location",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isDeliveryMessage) {
    routeParts.push("delivery");
    if (destination) {
      pushCall(getDeliveryOptions(destination));
    }
    if (productId) {
      pushCall(getNegotiationPolicy(productId, quantity ?? undefined));
    }
    return {
      prediction: createPrediction({
        intent_labels: ["delivery_question"],
        product_id: productId,
        action: "verify_delivery_terms_before_replying",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (isPriceMessage) {
    routeParts.push("pricing");
    if (productId) {
      pushCall(getNegotiationPolicy(productId, quantity ?? undefined));
    }
    return {
      prediction: createPrediction({
        intent_labels: ["pricing_request"],
        product_id: productId,
        action: "reply_with_verified_price",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (text.includes("nice page") || text.includes("great work") || text.includes("polished")) {
    routeParts.push("compliment");
    return {
      prediction: createPrediction({
        is_lead: false,
        lead_creation: false,
        intent_labels: ["compliment_only"],
        product_id: null,
        action: "thank_without_lead_creation",
        escalation: false,
        provisional_order: false,
        order_fields: null,
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  if (productId) {
    routeParts.push("default_sales");
    return {
      prediction: createPrediction({
        product_id: productId,
        intent_labels: ["ambiguous_product_reference"],
        action: "ask_for_clarifying_product_details",
      }),
      tool_calls: toolCalls,
      evidence_refs: [...evidenceRefs],
      route: routeParts.join(" > "),
    };
  }

  routeParts.push("clarification");
  return {
    prediction: createPrediction({
      intent_labels: ["ambiguous_product_reference"],
      product_id: null,
      action: "ask_for_clarifying_product_details",
    }),
    tool_calls: toolCalls,
    evidence_refs: [...evidenceRefs],
    route: routeParts.join(" > "),
  };
}
