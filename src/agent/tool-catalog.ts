import type { ToolEnvelope } from "../tools/verified-tools.js";
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
} from "../tools/verified-tools.js";
import type { AgentToolDefinition } from "./types.js";

export interface ToolExecutionResult {
  outcome: string;
  data: unknown;
  evidence_refs: string[];
  trace: {
    tool_name: string;
    sanitized_args: Record<string, unknown>;
    outcome: string;
    evidence_refs: string[];
    duration_ms: number;
    error_category?: string;
  };
}

export interface ToolRuntimeDefinition {
  definition: AgentToolDefinition;
  execute: (args: Record<string, unknown>) => ToolExecutionResult;
}

const TOOL_SCHEMAS: Record<string, Record<string, unknown>> = {
  findProductByPost: {
    type: "object",
    additionalProperties: false,
    required: ["channel", "postId"],
    properties: {
      channel: { type: "string", enum: ["facebook", "instagram", "tiktok", "email"] },
      postId: { type: "string", minLength: 1 },
    },
  },
  searchCatalogue: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query: { type: "string", minLength: 1 },
    },
  },
  getProduct: {
    type: "object",
    additionalProperties: false,
    required: ["productId"],
    properties: {
      productId: { type: "string", minLength: 1 },
    },
  },
  getRelatedProducts: {
    type: "object",
    additionalProperties: false,
    required: ["productId"],
    properties: {
      productId: { type: "string", minLength: 1 },
    },
  },
  getProductImages: {
    type: "object",
    additionalProperties: false,
    required: ["productId"],
    properties: {
      productId: { type: "string", minLength: 1 },
    },
  },
  checkInventory: {
    type: "object",
    additionalProperties: false,
    required: ["productId", "requestedVariant"],
    properties: {
      productId: { type: "string", minLength: 1 },
      requestedVariant: { type: ["string", "null"] },
    },
  },
  getBusinessLocation: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  getDeliveryOptions: {
    type: "object",
    additionalProperties: false,
    required: ["destination"],
    properties: {
      destination: { type: ["string", "null"] },
    },
  },
  getNegotiationPolicy: {
    type: "object",
    additionalProperties: false,
    required: ["productId", "quantity"],
    properties: {
      productId: { type: "string", minLength: 1 },
      quantity: { type: ["integer", "null"] },
    },
  },
  evaluateOffer: {
    type: "object",
    additionalProperties: false,
    required: ["productId", "offeredPrice", "quantity"],
    properties: {
      productId: { type: "string", minLength: 1 },
      offeredPrice: { type: "integer", minimum: 1 },
      quantity: { type: ["integer", "null"] },
    },
  },
  identifyMissingOrderFields: {
    type: "object",
    additionalProperties: false,
    required: ["orderDraft"],
    properties: {
      orderDraft: {
        type: "object",
        additionalProperties: false,
        required: [
          "product_id",
          "quantity",
          "variant",
          "delivery_city",
          "delivery_date",
          "payment_timing",
          "invoice_request",
          "discount_request",
          "partial_fulfillment",
          "payment_terms",
        ],
        properties: {
          product_id: { type: ["string", "null"] },
          quantity: { type: ["integer", "null"] },
          variant: { type: ["string", "null"] },
          delivery_city: { type: ["string", "null"] },
          delivery_date: { type: ["string", "null"] },
          payment_timing: { type: ["string", "null"] },
          invoice_request: { type: ["boolean", "null"] },
          discount_request: { type: ["string", "null"] },
          partial_fulfillment: { type: ["boolean", "null"] },
          payment_terms: { type: ["string", "null"] },
        },
      },
    },
  },
};

function toExecutionResult(
  toolName: string,
  envelope: ToolEnvelope<unknown>,
): ToolExecutionResult {
  return {
    outcome: envelope.outcome,
    data: envelope.data,
    evidence_refs: envelope.evidence_refs,
    trace: envelope.trace,
  };
}

export const CONTROLLED_TOOLS: ToolRuntimeDefinition[] = [
  {
    definition: {
      name: "findProductByPost",
      description:
        "Resolve a social post to its associated synthetic product. Safe outputs include product_id, sku, name, category, and safe_description.",
      parameters: TOOL_SCHEMAS.findProductByPost,
    },
    execute: (args) => toExecutionResult("findProductByPost", findProductByPost(args.channel, args.postId)),
  },
  {
    definition: {
      name: "searchCatalogue",
      description:
        "Search the synthetic catalogue for relevant products. Safe outputs include product_id, sku, name, category, score, and evidence_ref.",
      parameters: TOOL_SCHEMAS.searchCatalogue,
    },
    execute: (args) => toExecutionResult("searchCatalogue", searchCatalogue(args.query)),
  },
  {
    definition: {
      name: "getProduct",
      description:
        "Fetch a single synthetic product record by product_id. Safe outputs include product metadata and evidence_ref.",
      parameters: TOOL_SCHEMAS.getProduct,
    },
    execute: (args) => toExecutionResult("getProduct", getProduct(args.productId)),
  },
  {
    definition: {
      name: "getRelatedProducts",
      description:
        "Fetch related synthetic products for a product_id. Safe outputs include product_id, sku, name, category, and evidence_ref.",
      parameters: TOOL_SCHEMAS.getRelatedProducts,
    },
    execute: (args) => toExecutionResult("getRelatedProducts", getRelatedProducts(args.productId)),
  },
  {
    definition: {
      name: "getProductImages",
      description:
        "Return synthetic image references for a product_id. Safe outputs include product_id and image references only.",
      parameters: TOOL_SCHEMAS.getProductImages,
    },
    execute: (args) => toExecutionResult("getProductImages", getProductImages(args.productId)),
  },
  {
    definition: {
      name: "checkInventory",
      description:
        "Check synthetic inventory for a product_id and optional variant hint. Safe outputs include available_quantity and stock_status.",
      parameters: TOOL_SCHEMAS.checkInventory,
    },
    execute: (args) => toExecutionResult("checkInventory", checkInventory(args.productId, args.requestedVariant)),
  },
  {
    definition: {
      name: "getBusinessLocation",
      description:
        "Return the synthetic business location and contact policy. Safe outputs include location_summary and contact_policy.",
      parameters: TOOL_SCHEMAS.getBusinessLocation,
    },
    execute: () => toExecutionResult("getBusinessLocation", getBusinessLocation()),
  },
  {
    definition: {
      name: "getDeliveryOptions",
      description:
        "Return synthetic delivery options for a destination zone. Safe outputs include fee_rule_ugx, estimated_window, and pickup availability.",
      parameters: TOOL_SCHEMAS.getDeliveryOptions,
    },
    execute: (args) => toExecutionResult("getDeliveryOptions", getDeliveryOptions(args.destination)),
  },
  {
    definition: {
      name: "getNegotiationPolicy",
      description:
        "Return the synthetic negotiation policy for a product_id and optional quantity. Safe outputs include listed price, minimum permitted price, and disclosure rules.",
      parameters: TOOL_SCHEMAS.getNegotiationPolicy,
    },
    execute: (args) => toExecutionResult("getNegotiationPolicy", getNegotiationPolicy(args.productId, args.quantity)),
  },
  {
    definition: {
      name: "evaluateOffer",
      description:
        "Evaluate a customer offer against the synthetic negotiation policy. Safe outputs include outcome and a customer-facing summary that must not reveal confidential policy values.",
      parameters: TOOL_SCHEMAS.evaluateOffer,
    },
    execute: (args) => toExecutionResult("evaluateOffer", evaluateOffer(args.productId, args.offeredPrice, args.quantity)),
  },
  {
    definition: {
      name: "identifyMissingOrderFields",
      description:
        "Identify missing required order fields from a provisional order draft. Safe outputs include required_fields and missing_fields only.",
      parameters: TOOL_SCHEMAS.identifyMissingOrderFields,
    },
    execute: (args) => toExecutionResult("identifyMissingOrderFields", identifyMissingOrderFields(args.orderDraft)),
  },
];

export function getControlledToolDefinitions(): AgentToolDefinition[] {
  return CONTROLLED_TOOLS.map((tool) => tool.definition);
}

export function getControlledToolRuntime(name: string): ToolRuntimeDefinition | undefined {
  return CONTROLLED_TOOLS.find((tool) => tool.definition.name === name);
}

export function getToolDescriptionBlock(): string {
  return CONTROLLED_TOOLS.map((tool) => {
    const schema = JSON.stringify(tool.definition.parameters);
    return `- ${tool.definition.name}: ${tool.definition.description}\n  parameters: ${schema}`;
  }).join("\n");
}
