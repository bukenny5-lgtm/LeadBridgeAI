import { performance } from "node:perf_hooks";
import type { Channel } from "../shared/types.js";
import {
  getFixtureVersion,
  loadSyntheticFixtures,
  type DeliveryPolicyFixture,
  type InventoryRecordFixture,
  type NegotiationPolicyFixture,
  type PostProductMappingFixture,
  type ProductFixture,
  type SyntheticFixtures,
} from "../data/fixtures.js";

export type ToolOutcome =
  | "found"
  | "not_found"
  | "ambiguous"
  | "unavailable"
  | "invalid"
  | "escalation_required";

export interface ToolTraceRecord {
  tool_name: string;
  sanitized_args: Record<string, unknown>;
  outcome: ToolOutcome;
  evidence_refs: string[];
  duration_ms: number;
  error_category?: string;
}

export interface ToolEnvelope<T> {
  outcome: ToolOutcome;
  data: T | null;
  evidence_refs: string[];
  trace: ToolTraceRecord;
  error_category?: string;
}

export interface ProductMatch {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  listed_price_ugx: number;
  safe_description: string;
  active: boolean;
  evidence_ref: string;
}

export interface SearchResult {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  score: number;
  evidence_ref: string;
}

export interface ProductImageSet {
  product_id: string;
  image_references: string[];
  evidence_ref: string;
}

export interface InventoryStatus {
  product_id: string;
  variant_id: string;
  available_quantity: number;
  stock_status: string;
  evidence_ref: string;
}

export interface BusinessLocationInfo {
  business_id: string;
  business_name: string;
  location_summary: string;
  opening_hours: SyntheticFixtures["business"]["opening_hours"];
  contact_policy: SyntheticFixtures["business"]["contact_policy"];
  evidence_ref: string;
}

export interface DeliveryOption {
  delivery_policy_id: string;
  zone: string;
  fee_rule_ugx: number;
  estimated_window: string;
  pickup_available: boolean;
  approval_required: boolean;
  evidence_ref: string;
}

export interface NegotiationPolicyView {
  policy_id: string;
  product_id: string;
  listed_price_ugx: number;
  minimum_permitted_price_ugx: number;
  ordinary_discount_authority_pct: number;
  bulk_threshold_units: number;
  escalation_boundary: string;
  disclosure_rule: string;
  evidence_ref: string;
}

export interface OfferEvaluation {
  product_id: string;
  policy_id: string;
  offered_price_ugx: number;
  quantity: number;
  outcome: "within_policy" | "below_minimum" | "requires_review" | "invalid";
  customer_facing_summary: string;
  evidence_ref: string;
}

export interface MissingOrderFieldsResult {
  required_fields: string[];
  missing_fields: string[];
  evidence_ref: string;
}

const fixtures = loadSyntheticFixtures();
const fixtureVersion = getFixtureVersion();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value.trim();
}

function ensureOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return ensureString(value, field);
}

function ensureNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected ${field} to be a finite number`);
  }
  return value;
}

function ensureInteger(value: unknown, field: string): number {
  const numberValue = ensureNumber(value, field);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`Expected ${field} to be an integer`);
  }
  return numberValue;
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
}

function buildTrace(
  toolName: string,
  sanitizedArgs: Record<string, unknown>,
  outcome: ToolOutcome,
  evidenceRefs: string[],
  startedAt: number,
  errorCategory?: string,
): ToolTraceRecord {
  return {
    tool_name: toolName,
    sanitized_args: sanitizedArgs,
    outcome,
    evidence_refs: evidenceRefs,
    duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
    ...(errorCategory ? { error_category: errorCategory } : {}),
  };
}

function envelope<T>(
  toolName: string,
  args: Record<string, unknown>,
  outcome: ToolOutcome,
  data: T | null,
  evidenceRefs: string[],
  startedAt: number,
  errorCategory?: string,
): any {
  return {
    outcome,
    data,
    evidence_refs: evidenceRefs,
    trace: buildTrace(toolName, sanitizeArgs(args), outcome, evidenceRefs, startedAt, errorCategory),
    ...(errorCategory ? { error_category: errorCategory } : {}),
  };
}

function productEvidence(productId: string): string {
  return `product:${productId}`;
}

function policyEvidence(policyId: string): string {
  return `policy:${policyId}`;
}

function mappingEvidence(channel: string, postId: string): string {
  return `post:${channel}:${postId}`;
}

function deliveryEvidence(policyId: string, zone: string): string {
  return `delivery:${policyId}:${zone}`;
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

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function getProductById(productId: string): ProductFixture | undefined {
  return fixtures.products.find((product) => product.product_id === productId);
}

function getPolicyByProductId(productId: string): NegotiationPolicyFixture | undefined {
  return fixtures.negotiation_policies.find((policy) => policy.product_id === productId);
}

function getInventoryRecord(productId: string, variantId?: string): InventoryRecordFixture | undefined {
  if (variantId) {
    return fixtures.inventory.find(
      (record) => record.product_id === productId && record.variant_id === variantId,
    );
  }
  return fixtures.inventory.find((record) => record.product_id === productId);
}

function findDeliveryPolicyForZone(zone?: string): DeliveryPolicyFixture | undefined {
  if (!zone) {
    return undefined;
  }
  return fixtures.delivery_policies
    .slice()
    .sort((left, right) => left.priority - right.priority)
    .find((policy) => policy.supported_zones.some((supportedZone) => supportedZone.toLowerCase() === zone.toLowerCase()));
}

function productMatch(product: ProductFixture): ProductMatch {
  return {
    product_id: product.product_id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    listed_price_ugx: product.listed_price_ugx,
    safe_description: product.safe_description,
    active: product.active,
    evidence_ref: productEvidence(product.product_id),
  };
}

function searchScore(product: ProductFixture, queryTokens: string[]): number {
  const haystack = normalize(
    [
      product.product_id,
      product.sku,
      product.name,
      product.category,
      product.safe_description,
      ...product.variants.flatMap((variant) => [variant.variant_id, variant.colour, variant.size, variant.packaging, variant.design]),
    ].join(" "),
  );
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }
  if (queryTokens.some((token) => normalize(product.name).includes(token))) {
    score += 3;
  }
  return score;
}

function safeProductIdInput(productId: unknown): string {
  return ensureString(productId, "productId");
}

export function findProductByPost(
  channel: unknown,
  postId: unknown,
): ToolEnvelope<ProductMatch> {
  const startedAt = performance.now();
  try {
    const safeChannel = ensureString(channel, "channel") as Channel;
    const safePostId = ensureString(postId, "postId");
    const matches = fixtures.post_product_mappings.filter(
      (mapping) => mapping.channel === safeChannel && mapping.post_id === safePostId,
    );
    if (matches.length === 0) {
      return envelope(
        "findProductByPost",
        { channel: safeChannel, postId: safePostId },
        "not_found",
        null,
        [mappingEvidence(safeChannel, safePostId)],
        startedAt,
      );
    }
    if (matches.length > 1) {
      return envelope(
        "findProductByPost",
        { channel: safeChannel, postId: safePostId },
        "ambiguous",
        null,
        matches.map((match) => mappingEvidence(match.channel, match.post_id)),
        startedAt,
      );
    }
    const product = getProductById(matches[0].product_id);
    if (!product) {
      return envelope(
        "findProductByPost",
        { channel: safeChannel, postId: safePostId },
        "not_found",
        null,
        [mappingEvidence(safeChannel, safePostId)],
        startedAt,
      );
    }
    return envelope(
      "findProductByPost",
      { channel: safeChannel, postId: safePostId },
      "found",
      productMatch(product),
      [mappingEvidence(safeChannel, safePostId), productEvidence(product.product_id)],
      startedAt,
    );
  } catch (error) {
    return envelope(
      "findProductByPost",
      { channel, postId },
      "invalid",
      null,
      [],
      startedAt,
      error instanceof Error ? error.name : "invalid_input",
    );
  }
}

export function searchCatalogue(query: unknown): ToolEnvelope<SearchResult[]> {
  const startedAt = performance.now();
  try {
    const safeQuery = ensureString(query, "query");
    const queryTokens = tokenize(safeQuery);
    if (!queryTokens.length) {
      return envelope("searchCatalogue", { query: safeQuery }, "invalid", null, [], startedAt, "invalid_input");
    }
    const matches = fixtures.products
      .map((product) => ({
        product,
        score: searchScore(product, queryTokens),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => ({
        product_id: entry.product.product_id,
        sku: entry.product.sku,
        name: entry.product.name,
        category: entry.product.category,
        score: entry.score,
        evidence_ref: productEvidence(entry.product.product_id),
      }));
    if (matches.length === 0) {
      return envelope("searchCatalogue", { query: safeQuery }, "not_found", [], [], startedAt);
    }
    if (matches.length > 1 && (queryTokens.length === 1 || matches[0].score === matches[1].score)) {
      return envelope(
        "searchCatalogue",
        { query: safeQuery },
        "ambiguous",
        matches,
        matches.map((match) => match.evidence_ref),
        startedAt,
      );
    }
    return envelope(
      "searchCatalogue",
      { query: safeQuery },
      "found",
      matches,
      matches.map((match) => match.evidence_ref),
      startedAt,
    );
  } catch (error) {
    return envelope("searchCatalogue", { query }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getProduct(productId: unknown): ToolEnvelope<ProductMatch> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const product = getProductById(safeProductId);
    if (!product) {
      return envelope("getProduct", { productId: safeProductId }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    return envelope("getProduct", { productId: safeProductId }, "found", productMatch(product), [productEvidence(product.product_id)], startedAt);
  } catch (error) {
    return envelope("getProduct", { productId }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getRelatedProducts(productId: unknown): ToolEnvelope<ProductMatch[]> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const product = getProductById(safeProductId);
    if (!product) {
      return envelope("getRelatedProducts", { productId: safeProductId }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    const related = product.related_product_ids
      .map((relatedId) => getProductById(relatedId))
      .filter((entry): entry is ProductFixture => Boolean(entry))
      .map(productMatch);
    return envelope(
      "getRelatedProducts",
      { productId: safeProductId },
      related.length ? "found" : "not_found",
      related,
      [productEvidence(safeProductId), ...related.map((entry) => entry.evidence_ref)],
      startedAt,
    );
  } catch (error) {
    return envelope("getRelatedProducts", { productId }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getProductImages(productId: unknown): ToolEnvelope<ProductImageSet> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const product = getProductById(safeProductId);
    if (!product) {
      return envelope("getProductImages", { productId: safeProductId }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    return envelope(
      "getProductImages",
      { productId: safeProductId },
      "found",
      {
        product_id: product.product_id,
        image_references: product.synthetic_image_references,
        evidence_ref: productEvidence(product.product_id),
      },
      [productEvidence(product.product_id)],
      startedAt,
    );
  } catch (error) {
    return envelope("getProductImages", { productId }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function checkInventory(productId: unknown, requestedVariant?: unknown): ToolEnvelope<InventoryStatus[]> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const safeVariant = ensureOptionalString(requestedVariant, "requestedVariant");
    const product = getProductById(safeProductId);
    if (!product) {
      return envelope("checkInventory", { productId: safeProductId, requestedVariant: safeVariant }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    const candidateVariantIds = safeVariant
      ? product.variants.filter((variant) =>
          [variant.variant_id, variant.colour, variant.size, variant.packaging, variant.design]
            .map((entry) => entry.toLowerCase())
            .includes(safeVariant.toLowerCase()),
        ).map((variant) => variant.variant_id)
      : product.variants.map((variant) => variant.variant_id);
    const records = fixtures.inventory.filter(
      (record) => record.product_id === safeProductId && candidateVariantIds.includes(record.variant_id),
    );
    if (safeVariant && candidateVariantIds.length === 0) {
      return envelope(
        "checkInventory",
        { productId: safeProductId, requestedVariant: safeVariant },
        "unavailable",
        [],
        [productEvidence(safeProductId)],
        startedAt,
      );
    }
    const evidenceRefs = records.map((record) => `${productEvidence(record.product_id)}#${record.variant_id}`);
    return envelope(
      "checkInventory",
      { productId: safeProductId, requestedVariant: safeVariant },
      records.length ? "found" : "unavailable",
      records.map((record) => ({
        product_id: record.product_id,
        variant_id: record.variant_id,
        available_quantity: record.available_quantity,
        stock_status: record.stock_status,
        evidence_ref: `${productEvidence(record.product_id)}#${record.variant_id}`,
      })),
      evidenceRefs,
      startedAt,
    );
  } catch (error) {
    return envelope("checkInventory", { productId, requestedVariant }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getBusinessLocation(): ToolEnvelope<BusinessLocationInfo> {
  const startedAt = performance.now();
  return envelope(
    "getBusinessLocation",
    {},
    "found",
    {
      business_id: fixtures.business.business_id,
      business_name: fixtures.business.business_name,
      location_summary: fixtures.business.location_summary,
      opening_hours: fixtures.business.opening_hours,
      contact_policy: fixtures.business.contact_policy,
      evidence_ref: `business:${fixtures.business.business_id}`,
    },
    [`business:${fixtures.business.business_id}`],
    startedAt,
  );
}

export function getDeliveryOptions(destination?: unknown): ToolEnvelope<DeliveryOption[]> {
  const startedAt = performance.now();
  try {
    const safeDestination = ensureOptionalString(destination, "destination");
    if (!safeDestination) {
      return envelope(
        "getDeliveryOptions",
        { destination: safeDestination },
        "found",
        fixtures.delivery_policies.flatMap((policy) =>
          policy.supported_zones.map((zone) => ({
            delivery_policy_id: policy.delivery_policy_id,
            zone,
            fee_rule_ugx: policy.fee_rule_ugx,
            estimated_window: policy.estimated_window,
            pickup_available: policy.pickup_available,
            approval_required: policy.approval_required,
            evidence_ref: deliveryEvidence(policy.delivery_policy_id, zone),
          })),
        ),
        fixtures.delivery_policies.flatMap((policy) =>
          policy.supported_zones.map((zone) => deliveryEvidence(policy.delivery_policy_id, zone)),
        ),
        startedAt,
      );
    }
    const policy = findDeliveryPolicyForZone(safeDestination);
    if (!policy) {
      return envelope(
        "getDeliveryOptions",
        { destination: safeDestination },
        "unavailable",
        [],
        [],
        startedAt,
      );
    }
    return envelope(
      "getDeliveryOptions",
      { destination: safeDestination },
      "found",
      [
        {
          delivery_policy_id: policy.delivery_policy_id,
          zone: safeDestination,
          fee_rule_ugx: policy.fee_rule_ugx,
          estimated_window: policy.estimated_window,
          pickup_available: policy.pickup_available,
          approval_required: policy.approval_required,
          evidence_ref: deliveryEvidence(policy.delivery_policy_id, safeDestination),
        },
      ],
      [deliveryEvidence(policy.delivery_policy_id, safeDestination)],
      startedAt,
    );
  } catch (error) {
    return envelope("getDeliveryOptions", { destination }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getNegotiationPolicy(productId: unknown, quantity?: unknown): ToolEnvelope<NegotiationPolicyView> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const safeQuantity = quantity === undefined ? undefined : ensureInteger(quantity, "quantity");
    const policy = getPolicyByProductId(safeProductId);
    if (!policy) {
      return envelope("getNegotiationPolicy", { productId: safeProductId, quantity: safeQuantity }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    return envelope(
      "getNegotiationPolicy",
      { productId: safeProductId, quantity: safeQuantity },
      "found",
      {
        policy_id: policy.policy_id,
        product_id: policy.product_id,
        listed_price_ugx: policy.listed_price_ugx,
        minimum_permitted_price_ugx: policy.minimum_permitted_price_ugx,
        ordinary_discount_authority_pct: policy.ordinary_discount_authority_pct,
        bulk_threshold_units: policy.bulk_threshold_units,
        escalation_boundary: policy.escalation_boundary,
        disclosure_rule: policy.disclosure_rule,
        evidence_ref: policyEvidence(policy.policy_id),
      },
      [policyEvidence(policy.policy_id)],
      startedAt,
    );
  } catch (error) {
    return envelope("getNegotiationPolicy", { productId, quantity }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function evaluateOffer(
  productId: unknown,
  offeredPrice: unknown,
  quantity?: unknown,
): ToolEnvelope<OfferEvaluation> {
  const startedAt = performance.now();
  try {
    const safeProductId = safeProductIdInput(productId);
    const safeOfferedPrice = ensureInteger(offeredPrice, "offeredPrice");
    const safeQuantity = quantity === undefined ? 1 : ensureInteger(quantity, "quantity");
    const policy = getPolicyByProductId(safeProductId);
    if (!policy) {
      return envelope("evaluateOffer", { productId: safeProductId, offeredPrice: safeOfferedPrice, quantity: safeQuantity }, "not_found", null, [productEvidence(safeProductId)], startedAt);
    }
    let outcome: OfferEvaluation["outcome"] = "requires_review";
    let customer_facing_summary = "The offer should be reviewed by a human.";
    if (safeOfferedPrice < policy.minimum_permitted_price_ugx) {
      outcome = "below_minimum";
      customer_facing_summary = "The offer is below the permitted range and needs human review.";
    } else if (safeOfferedPrice <= policy.listed_price_ugx) {
      outcome = "within_policy";
      customer_facing_summary = "The offer is within the ordinary policy range.";
    }
    return envelope(
      "evaluateOffer",
      { productId: safeProductId, offeredPrice: safeOfferedPrice, quantity: safeQuantity },
      "found",
      {
        product_id: safeProductId,
        policy_id: policy.policy_id,
        offered_price_ugx: safeOfferedPrice,
        quantity: safeQuantity,
        outcome,
        customer_facing_summary,
        evidence_ref: policyEvidence(policy.policy_id),
      },
      [policyEvidence(policy.policy_id)],
      startedAt,
    );
  } catch (error) {
    return envelope("evaluateOffer", { productId, offeredPrice, quantity }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function identifyMissingOrderFields(orderDraft: unknown): ToolEnvelope<MissingOrderFieldsResult> {
  const startedAt = performance.now();
  try {
    if (!isRecord(orderDraft)) {
      return envelope("identifyMissingOrderFields", { orderDraft }, "invalid", null, [], startedAt, "invalid_input");
    }
    const requiredFields = ["product_id", "quantity", "variant", "delivery_city", "delivery_date", "payment_timing", "invoice_request"];
    const missingFields = requiredFields.filter((field) => {
      const value = orderDraft[field];
      return value === undefined || value === null || value === "";
    });
    return envelope(
      "identifyMissingOrderFields",
      orderDraft,
      "found",
      {
        required_fields: requiredFields,
        missing_fields: missingFields,
        evidence_ref: `fixture:${fixtureVersion}`,
      },
      [`fixture:${fixtureVersion}`],
      startedAt,
    );
  } catch (error) {
    return envelope("identifyMissingOrderFields", { orderDraft }, "invalid", null, [], startedAt, error instanceof Error ? error.name : "invalid_input");
  }
}

export function getFixtureSnapshot(): SyntheticFixtures {
  return fixtures;
}
