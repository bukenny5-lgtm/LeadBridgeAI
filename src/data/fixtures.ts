import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Channel } from "../shared/types.js";

export interface BusinessFixture {
  schema_version: string;
  business_id: string;
  business_name: string;
  location_summary: string;
  opening_hours: {
    monday_to_friday: string;
    saturday: string;
    sunday: string;
  };
  contact_policy: {
    supports_whatsapp_handoff: boolean;
    supports_phone_handoff: boolean;
    real_phone_number: string | null;
    real_email: string | null;
    customer_handoff_channel: string;
  };
}

export interface ProductVariantFixture {
  variant_id: string;
  colour: string;
  size: string;
  packaging: string;
  design: string;
}

export interface ProductFixture {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  safe_description: string;
  listed_price_ugx: number;
  active: boolean;
  variants: ProductVariantFixture[];
  synthetic_image_references: string[];
  related_product_ids: string[];
}

export interface InventoryRecordFixture {
  product_id: string;
  variant_id: string;
  available_quantity: number;
  stock_status: string;
}

export interface DeliveryPolicyFixture {
  delivery_policy_id: string;
  priority: number;
  supported_zones: string[];
  fee_rule_ugx: number;
  estimated_window: string;
  pickup_available: boolean;
  approval_required: boolean;
  unsupported_zones: string[];
}

export interface NegotiationPolicyFixture {
  policy_id: string;
  product_id: string;
  listed_price_ugx: number;
  minimum_permitted_price_ugx: number;
  ordinary_discount_authority_pct: number;
  bulk_threshold_units: number;
  escalation_boundary: string;
  disclosure_rule: string;
}

export interface PostProductMappingFixture {
  channel: Channel;
  post_id: string;
  product_id: string;
}

export interface SyntheticFixtures {
  business: BusinessFixture;
  products: ProductFixture[];
  inventory: InventoryRecordFixture[];
  delivery_policies: DeliveryPolicyFixture[];
  negotiation_policies: NegotiationPolicyFixture[];
  post_product_mappings: PostProductMappingFixture[];
}

export interface ValidationIssue {
  scope: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: boolean, scope: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[${scope}] ${message}`);
  }
}

function readString(value: unknown, scope: string, field: string): string {
  assert(typeof value === "string", scope, `Expected ${field} to be a string`);
  return value;
}

function readNullableString(value: unknown, scope: string, field: string): string | null {
  assert(typeof value === "string" || value === null, scope, `Expected ${field} to be a string or null`);
  return value;
}

function readBoolean(value: unknown, scope: string, field: string): boolean {
  assert(typeof value === "boolean", scope, `Expected ${field} to be a boolean`);
  return value;
}

function readNumber(value: unknown, scope: string, field: string): number {
  assert(typeof value === "number" && Number.isFinite(value), scope, `Expected ${field} to be a finite number`);
  return value;
}

function readInteger(value: unknown, scope: string, field: string): number {
  const numberValue = readNumber(value, scope, field);
  assert(Number.isInteger(numberValue), scope, `Expected ${field} to be an integer`);
  return numberValue;
}

function readStringArray(value: unknown, scope: string, field: string): string[] {
  assert(Array.isArray(value), scope, `Expected ${field} to be an array`);
  value.forEach((entry, index) => {
    assert(typeof entry === "string", scope, `Expected ${field}[${index}] to be a string`);
  });
  return value;
}

function readObject(value: unknown, scope: string, field: string): Record<string, unknown> {
  assert(isRecord(value), scope, `Expected ${field} to be an object`);
  return value;
}

function validateBusiness(raw: unknown): BusinessFixture {
  const scope = "business";
  const value = readObject(raw, scope, "business");
  assert(!("case_id" in value), scope, "Fixtures must not contain case_id fields");
  assert(!("expected" in value), scope, "Fixtures must not contain expected fields");
  return {
    schema_version: readString(value.schema_version, scope, "schema_version"),
    business_id: readString(value.business_id, scope, "business_id"),
    business_name: readString(value.business_name, scope, "business_name"),
    location_summary: readString(value.location_summary, scope, "location_summary"),
    opening_hours: (() => {
      const openingHours = readObject(value.opening_hours, scope, "opening_hours");
      return {
        monday_to_friday: readString(openingHours.monday_to_friday, scope, "opening_hours.monday_to_friday"),
        saturday: readString(openingHours.saturday, scope, "opening_hours.saturday"),
        sunday: readString(openingHours.sunday, scope, "opening_hours.sunday"),
      };
    })(),
    contact_policy: (() => {
      const contactPolicy = readObject(value.contact_policy, scope, "contact_policy");
      return {
        supports_whatsapp_handoff: readBoolean(contactPolicy.supports_whatsapp_handoff, scope, "contact_policy.supports_whatsapp_handoff"),
        supports_phone_handoff: readBoolean(contactPolicy.supports_phone_handoff, scope, "contact_policy.supports_phone_handoff"),
        real_phone_number: readNullableString(contactPolicy.real_phone_number, scope, "contact_policy.real_phone_number"),
        real_email: readNullableString(contactPolicy.real_email, scope, "contact_policy.real_email"),
        customer_handoff_channel: readString(contactPolicy.customer_handoff_channel, scope, "contact_policy.customer_handoff_channel"),
      };
    })(),
  };
}

function validateProduct(raw: unknown, index: number): ProductFixture {
  const scope = `products[${index}]`;
  const value = readObject(raw, scope, "product");
  assert(!("case_id" in value), scope, "Fixtures must not contain case_id fields");
  assert(!("expected" in value), scope, "Fixtures must not contain expected fields");
  const variantsRaw = readObject(value as Record<string, unknown>, scope, "product");
  const variants = Array.isArray(variantsRaw.variants) ? variantsRaw.variants : [];
  return {
    product_id: readString(value.product_id, scope, "product_id"),
    sku: readString(value.sku, scope, "sku"),
    name: readString(value.name, scope, "name"),
    category: readString(value.category, scope, "category"),
    safe_description: readString(value.safe_description, scope, "safe_description"),
    listed_price_ugx: readInteger(value.listed_price_ugx, scope, "listed_price_ugx"),
    active: readBoolean(value.active, scope, "active"),
    variants: variants.map((variant, variantIndex) => {
      const variantScope = `${scope}.variants[${variantIndex}]`;
      const variantValue = readObject(variant, variantScope, "variant");
      return {
        variant_id: readString(variantValue.variant_id, variantScope, "variant_id"),
        colour: readString(variantValue.colour, variantScope, "colour"),
        size: readString(variantValue.size, variantScope, "size"),
        packaging: readString(variantValue.packaging, variantScope, "packaging"),
        design: readString(variantValue.design, variantScope, "design"),
      };
    }),
    synthetic_image_references: readStringArray(value.synthetic_image_references, scope, "synthetic_image_references"),
    related_product_ids: readStringArray(value.related_product_ids, scope, "related_product_ids"),
  };
}

function validateInventory(raw: unknown, index: number): InventoryRecordFixture {
  const scope = `inventory[${index}]`;
  const value = readObject(raw, scope, "inventory record");
  return {
    product_id: readString(value.product_id, scope, "product_id"),
    variant_id: readString(value.variant_id, scope, "variant_id"),
    available_quantity: readInteger(value.available_quantity, scope, "available_quantity"),
    stock_status: readString(value.stock_status, scope, "stock_status"),
  };
}

function validateDeliveryPolicy(raw: unknown, index: number): DeliveryPolicyFixture {
  const scope = `delivery_policies[${index}]`;
  const value = readObject(raw, scope, "delivery policy");
  return {
    delivery_policy_id: readString(value.delivery_policy_id, scope, "delivery_policy_id"),
    priority: readInteger(value.priority, scope, "priority"),
    supported_zones: readStringArray(value.supported_zones, scope, "supported_zones"),
    fee_rule_ugx: readInteger(value.fee_rule_ugx, scope, "fee_rule_ugx"),
    estimated_window: readString(value.estimated_window, scope, "estimated_window"),
    pickup_available: readBoolean(value.pickup_available, scope, "pickup_available"),
    approval_required: readBoolean(value.approval_required, scope, "approval_required"),
    unsupported_zones: readStringArray(value.unsupported_zones, scope, "unsupported_zones"),
  };
}

function validateNegotiationPolicy(raw: unknown, index: number): NegotiationPolicyFixture {
  const scope = `negotiation_policies[${index}]`;
  const value = readObject(raw, scope, "negotiation policy");
  return {
    policy_id: readString(value.policy_id, scope, "policy_id"),
    product_id: readString(value.product_id, scope, "product_id"),
    listed_price_ugx: readInteger(value.listed_price_ugx, scope, "listed_price_ugx"),
    minimum_permitted_price_ugx: readInteger(value.minimum_permitted_price_ugx, scope, "minimum_permitted_price_ugx"),
    ordinary_discount_authority_pct: readInteger(value.ordinary_discount_authority_pct, scope, "ordinary_discount_authority_pct"),
    bulk_threshold_units: readInteger(value.bulk_threshold_units, scope, "bulk_threshold_units"),
    escalation_boundary: readString(value.escalation_boundary, scope, "escalation_boundary"),
    disclosure_rule: readString(value.disclosure_rule, scope, "disclosure_rule"),
  };
}

function validateMapping(raw: unknown, index: number): PostProductMappingFixture {
  const scope = `post_product_mappings[${index}]`;
  const value = readObject(raw, scope, "post-product mapping");
  return {
    channel: readString(value.channel, scope, "channel") as Channel,
    post_id: readString(value.post_id, scope, "post_id"),
    product_id: readString(value.product_id, scope, "product_id"),
  };
}

function loadJson<T>(relativePath: string): T {
  const absolutePath = fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

export function loadSyntheticFixtures(): SyntheticFixtures {
  const business = validateBusiness(loadJson<unknown>("data/business.json"));
  const products = (loadJson<unknown>("data/products.json") as Record<string, unknown>).products;
  const inventory = (loadJson<unknown>("data/inventory.json") as Record<string, unknown>).records;
  const deliveryPolicies = (loadJson<unknown>("data/delivery-policies.json") as Record<string, unknown>).rules;
  const negotiationPolicies = (loadJson<unknown>("data/negotiation-policies.json") as Record<string, unknown>).policies;
  const mappings = (loadJson<unknown>("data/post-product-mappings.json") as Record<string, unknown>).mappings;

  assert(Array.isArray(products), "products", "Expected products to be an array");
  assert(Array.isArray(inventory), "inventory", "Expected inventory to be an array");
  assert(Array.isArray(deliveryPolicies), "delivery_policies", "Expected delivery policies to be an array");
  assert(Array.isArray(negotiationPolicies), "negotiation_policies", "Expected negotiation policies to be an array");
  assert(Array.isArray(mappings), "post_product_mappings", "Expected post-product mappings to be an array");

  return {
    business,
    products: products.map(validateProduct),
    inventory: inventory.map(validateInventory),
    delivery_policies: deliveryPolicies.map(validateDeliveryPolicy),
    negotiation_policies: negotiationPolicies.map(validateNegotiationPolicy),
    post_product_mappings: mappings.map(validateMapping),
  };
}

function ensureUnique(values: string[], scope: string, label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assert(!seen.has(value), scope, `Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function ensureSafeImageReference(reference: string, scope: string): void {
  assert(/^synthetic:\/\/images\/[a-z0-9-]+\/[a-z0-9._-]+$/i.test(reference), scope, `Invalid image reference: ${reference}`);
}

export function validateSyntheticFixtures(fixtures: SyntheticFixtures): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (scope: string, message: string): void => {
    issues.push({ scope, message });
  };

  try {
    ensureUnique(fixtures.products.map((product) => product.product_id), "products", "product_id");
    ensureUnique(fixtures.products.map((product) => product.sku), "products", "sku");

    const productIds = new Set(fixtures.products.map((product) => product.product_id));
    const productById = new Map(fixtures.products.map((product) => [product.product_id, product] as const));
    const variantLookup = new Map<string, Set<string>>();
    for (const product of fixtures.products) {
      const variantIds = new Set<string>();
      for (const variant of product.variants) {
        const combo = `${variant.colour}|${variant.size}|${variant.packaging}|${variant.design}`;
        assert(!variantIds.has(combo), "products", `Duplicate variant combination for ${product.product_id}: ${combo}`);
        variantIds.add(combo);
        ensureSafeImageReference(product.synthetic_image_references[0] ?? "", `products.${product.product_id}.images`);
      }
      variantLookup.set(product.product_id, new Set(product.variants.map((variant) => variant.variant_id)));
      for (const relatedProductId of product.related_product_ids) {
        assert(productIds.has(relatedProductId), "products", `Related product missing: ${relatedProductId}`);
      }
    }

    for (const record of fixtures.inventory) {
      assert(productIds.has(record.product_id), "inventory", `Unknown product_id: ${record.product_id}`);
      const validVariants = variantLookup.get(record.product_id);
      assert(!!validVariants && validVariants.has(record.variant_id), "inventory", `Unknown variant_id ${record.variant_id} for ${record.product_id}`);
      assert(record.available_quantity >= 0, "inventory", "Inventory quantity must be nonnegative");
      assert(Number.isInteger(record.available_quantity), "inventory", "Inventory quantity must be an integer");
    }

    const zoneOwners = new Map<string, string>();
    for (const policy of fixtures.delivery_policies) {
      assert(policy.priority >= 0, "delivery_policies", "Priority must be nonnegative");
      assert(policy.fee_rule_ugx >= 0, "delivery_policies", "Fee must be nonnegative");
      for (const zone of policy.supported_zones) {
        const owner = zoneOwners.get(zone);
        if (owner) {
          push("delivery_policies", `Zone ${zone} appears in both ${owner} and ${policy.delivery_policy_id}`);
        } else {
          zoneOwners.set(zone, policy.delivery_policy_id);
        }
      }
      for (const unsupportedZone of policy.unsupported_zones) {
        if (zoneOwners.has(unsupportedZone)) {
          push("delivery_policies", `Unsupported zone overlaps supported zone: ${unsupportedZone}`);
        }
      }
    }

    const listedPrices = new Map(fixtures.negotiation_policies.map((policy) => [policy.product_id, policy.listed_price_ugx] as const));
    for (const policy of fixtures.negotiation_policies) {
      assert(productIds.has(policy.product_id), "negotiation_policies", `Unknown product_id: ${policy.product_id}`);
      assert(policy.minimum_permitted_price_ugx <= policy.listed_price_ugx, "negotiation_policies", `Minimum exceeds listed price for ${policy.product_id}`);
      const product = productById.get(policy.product_id);
      if (product) {
        assert(product.listed_price_ugx === policy.listed_price_ugx, "negotiation_policies", `Listed price mismatch for ${policy.product_id}`);
      }
    }

    const mappingKeys = new Set<string>();
    for (const mapping of fixtures.post_product_mappings) {
      const key = `${mapping.channel}:${mapping.post_id}`;
      assert(!mappingKeys.has(key), "post_product_mappings", `Duplicate mapping for ${key}`);
      mappingKeys.add(key);
      assert(productIds.has(mapping.product_id), "post_product_mappings", `Unknown product_id: ${mapping.product_id}`);
    }

    for (const businessField of [fixtures.business.business_name, fixtures.business.location_summary, fixtures.business.contact_policy.customer_handoff_channel]) {
      assert(!/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/.test(businessField), "business", "Business fixtures must not contain real email addresses");
      assert(!/\+?\d[\d\s()-]{6,}/.test(businessField), "business", "Business fixtures must not contain real phone numbers");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("[") && message.includes("]")) {
      const closing = message.indexOf("]");
      issues.push({ scope: message.slice(1, closing), message: message.slice(closing + 2) });
    } else {
      issues.push({ scope: "fixtures", message });
    }
  }

  return issues;
}

export function getFixtureVersion(): string {
  return "2026-08-29.synthetic.1";
}
