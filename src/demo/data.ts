import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEvaluationCases } from "../evaluation/loader.js";
import { runToolAssistedWorkflow } from "../workflow/tool-assisted.js";
import { findProductByPost, getBusinessLocation, getDeliveryOptions, getNegotiationPolicy, getProduct, getProductImages, checkInventory, evaluateOffer } from "../tools/verified-tools.js";
import type { DemoBootstrapPayload, DemoEvidenceItem, DemoEvaluationCard, DemoMessageRecord, DemoMessageSeed, DemoTraceStep, DemoWorkflowSnapshot } from "./types.js";
import type { ConversationMessage } from "../shared/types.js";

interface StoredEvaluationSummary {
  primary_metric: {
    score: number;
    passed_cases: number;
    total_cases: number;
  };
}

const DEMO_MESSAGE_SEEDS: DemoMessageSeed[] = [
  { id: "demo-001", scenario: "price inquiry", username: "@lina.store", channel: "facebook", timestamp: "2026-08-30T08:05:00+03:00", post_id: "fb-post-001", case_index: 0 },
  { id: "demo-002", scenario: "availability inquiry", username: "@nora.shop", channel: "instagram", timestamp: "2026-08-30T08:12:00+03:00", post_id: "ig-post-002", case_index: 1 },
  { id: "demo-003", scenario: "image request", username: "@timo.buys", channel: "tiktok", timestamp: "2026-08-30T08:19:00+03:00", post_id: "tt-post-003", case_index: 2 },
  { id: "demo-004", scenario: "location question", username: "orders@northlane.example", channel: "email", timestamp: "2026-08-30T08:26:00+03:00", post_id: "ig-post-004", case_index: 3 },
  { id: "demo-005", scenario: "delivery question", username: "@haruna.pickup", channel: "facebook", timestamp: "2026-08-30T08:33:00+03:00", post_id: "fb-post-005", case_index: 4 },
  { id: "demo-006", scenario: "negotiation", username: "@amos.bulk", channel: "instagram", timestamp: "2026-08-30T08:40:00+03:00", post_id: "ig-post-006", case_index: 5 },
  { id: "demo-007", scenario: "confirmed order", username: "sales@coastal.example", channel: "email", timestamp: "2026-08-30T08:47:00+03:00", post_id: "ig-post-011", case_index: 10 },
  { id: "demo-008", scenario: "complaint", username: "@sarah.care", channel: "instagram", timestamp: "2026-08-30T08:54:00+03:00", post_id: "ig-post-014", case_index: 13 },
  { id: "demo-009", scenario: "phone handoff", username: "+256 700 123 456", channel: "email", timestamp: "2026-08-30T09:01:00+03:00", post_id: "fb-post-015", case_index: 14 },
  { id: "demo-010", scenario: "prompt injection", username: "@system.override", channel: "facebook", timestamp: "2026-08-30T09:08:00+03:00", post_id: "fb-post-016", case_index: 15 },
  { id: "demo-011", scenario: "spam", username: "@promo.spark", channel: "facebook", timestamp: "2026-08-30T09:15:00+03:00", post_id: "fb-post-013", case_index: 12 },
  { id: "demo-012", scenario: "inventory and delivery", username: "@kelvin.team", channel: "instagram", timestamp: "2026-08-30T09:22:00+03:00", post_id: "ig-post-020", case_index: 19 },
];

const SYNTHETIC_INCOMING_TEMPLATES: Array<Omit<DemoMessageSeed, "id" | "timestamp"> & { conversation: ConversationMessage[] }> = [
  {
    scenario: "price inquiry",
    username: "@new.lead",
    channel: "facebook",
    post_id: "fb-post-001",
    case_index: 0,
    conversation: [
      { role: "customer", timestamp: "2026-08-30T10:00:00+03:00", text: "Hi, how much is the blue bottle?" },
      { role: "agent", timestamp: "2026-08-30T10:00:10+03:00", text: "Let me verify the public price." },
    ],
  },
  {
    scenario: "delivery question",
    username: "@city.buyers",
    channel: "instagram",
    post_id: "ig-post-005",
    case_index: 4,
    conversation: [
      { role: "customer", timestamp: "2026-08-30T10:03:00+03:00", text: "Can you deliver to my area tomorrow?" },
      { role: "agent", timestamp: "2026-08-30T10:03:12+03:00", text: "I’ll check the delivery window." },
    ],
  },
  {
    scenario: "confirmed order",
    username: "@demo.checkout",
    channel: "email",
    post_id: "ig-post-011",
    case_index: 10,
    conversation: [
      { role: "customer", timestamp: "2026-08-30T10:06:00+03:00", text: "Please confirm the order for 2 bottles." },
      { role: "agent", timestamp: "2026-08-30T10:06:08+03:00", text: "I’ll verify the missing order fields." },
    ],
  },
];

function cloneConversation(conversation: ConversationMessage[]): ConversationMessage[] {
  return conversation.map((message) => ({ ...message }));
}

function pushUniqueItem(items: DemoEvidenceItem[], item: DemoEvidenceItem): void {
  if (!items.some((entry) => entry.category === item.category && entry.label === item.label && entry.value === item.value)) {
    items.push(item);
  }
}

function previewOf(conversation: ConversationMessage[]): string {
  const text = conversation.find((message) => message.role === "customer")?.text ?? "";
  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

function buildConversationPreview(conversation: ConversationMessage[]): string {
  return previewOf(conversation);
}

function readSummary(relativePath: string): StoredEvaluationSummary {
  const absolutePath = join(process.cwd(), relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as StoredEvaluationSummary;
}

function buildEvidenceItems(seed: DemoMessageSeed, workflow: ReturnType<typeof runToolAssistedWorkflow>): DemoEvidenceItem[] {
  const items: DemoEvidenceItem[] = [];
  const conversation = cloneConversation(loadEvaluationCases()[seed.case_index]!.runnable.conversation);
  const customerMessage = conversation.find((message) => message.role === "customer");

  if (customerMessage) {
    pushUniqueItem(items, {
      category: "customer",
      label: "Customer request",
      value: customerMessage.text,
    });
  }

  pushUniqueItem(items, {
    category: "inferred",
    label: "Interpretation",
    value: `${workflow.prediction.intent_labels.join(", ")} · ${workflow.prediction.action}`,
  });

  for (const toolCall of workflow.tool_calls) {
    if (toolCall.tool_name === "findProductByPost") {
      const channel = String(toolCall.sanitized_args.channel ?? seed.channel);
      const postId = String(toolCall.sanitized_args.postId ?? seed.post_id ?? "");
      const mapping = findProductByPost(channel, postId);
      if (mapping.data) {
        pushUniqueItem(items, {
          category: "verified",
          label: "Post mapping",
          value: `${channel} / ${postId} → ${mapping.data.name} (${mapping.data.product_id})`,
        });
      }
    }
    if (toolCall.tool_name === "getProduct" && workflow.prediction.product_id) {
      const product = getProduct(workflow.prediction.product_id);
      if (product.data) {
        pushUniqueItem(items, {
          category: "verified",
          label: "Product reference",
          value: `${product.data.name} | ${product.data.sku} | ${product.data.category}`,
        });
        pushUniqueItem(items, {
          category: "verified",
          label: "Public price",
          value: `${product.data.product_id} is listed at UGX ${product.data.listed_price_ugx.toLocaleString("en-US")}`,
        });
      }
    }
    if (toolCall.tool_name === "checkInventory" && workflow.prediction.product_id) {
      const requestedVariant = toolCall.sanitized_args.requestedVariant as string | null | undefined;
      const inventory = checkInventory(workflow.prediction.product_id, requestedVariant ?? undefined);
      if (inventory.data?.[0]) {
        const item = inventory.data[0];
        pushUniqueItem(items, {
          category: "verified",
          label: "Stock status",
          value: `${item.variant_id}: ${item.stock_status} (${item.available_quantity} available)`,
        });
      }
    }
    if (toolCall.tool_name === "getDeliveryOptions") {
      const destination = String(toolCall.sanitized_args.destination ?? "");
      const delivery = getDeliveryOptions(destination);
      if (delivery.data?.[0]) {
        const item = delivery.data[0];
        pushUniqueItem(items, {
          category: "verified",
          label: "Delivery option",
          value: `${item.zone}: fee rule UGX ${item.fee_rule_ugx}, window ${item.estimated_window}`,
        });
      }
    }
    if (toolCall.tool_name === "getBusinessLocation") {
      const location = getBusinessLocation();
      if (location.data) {
        pushUniqueItem(items, {
          category: "verified",
          label: "Business location",
          value: location.data.location_summary,
        });
      }
    }
    if (toolCall.tool_name === "getProductImages" && workflow.prediction.product_id) {
      const images = getProductImages(workflow.prediction.product_id);
      if (images.data) {
        pushUniqueItem(items, {
          category: "verified",
          label: "Image availability",
          value: `${images.data.image_references.length} synthetic image reference(s) available`,
        });
      }
    }
    if (toolCall.tool_name === "getNegotiationPolicy" && workflow.prediction.product_id) {
      const policy = getNegotiationPolicy(workflow.prediction.product_id, toolCall.sanitized_args.quantity as number | undefined);
      if (policy.data) {
        items.push({
          category: "verified",
          label: "Negotiation outcome",
          value: `${policy.data.listed_price_ugx.toLocaleString("en-US")} UGX listed price, ${policy.data.ordinary_discount_authority_pct}% ordinary discount authority`,
        });
      }
    }
    if (toolCall.tool_name === "evaluateOffer" && workflow.prediction.product_id) {
      const offeredPrice = toolCall.sanitized_args.offeredPrice as number;
      const quantity = toolCall.sanitized_args.quantity as number | undefined;
      const offer = evaluateOffer(workflow.prediction.product_id, offeredPrice, quantity ?? undefined);
      if (offer.data) {
        pushUniqueItem(items, {
          category: "verified",
          label: "Negotiation outcome",
          value: `${offer.data.outcome}: ${offer.data.customer_facing_summary}`,
        });
      }
    }
  }

  if (workflow.prediction.product_id === null) {
    pushUniqueItem(items, {
      category: "missing",
      label: "Product association",
      value: "No direct product association could be verified from the current request.",
    });
  }

  return items;
}

function buildTrace(workflow: ReturnType<typeof runToolAssistedWorkflow>): DemoTraceStep[] {
  return [
    {
      title: "Message received",
      detail: `${workflow.prediction.intent_labels.join(", ")} from the synthetic inbox.`,
    },
    {
      title: "Intent interpreted",
      detail: `Route: ${workflow.route || "n/a"}.`,
    },
    {
      title: "Tools used",
      detail: workflow.tool_calls.map((call) => call.tool_name).join(" → ") || "No tools were needed.",
    },
    {
      title: "Evidence collected",
      detail: workflow.evidence_refs.join(", ") || "No evidence references were collected.",
    },
    {
      title: "Policy decision",
      detail: workflow.prediction.escalation
        ? `Escalation required: ${workflow.prediction.action}.`
        : "Approval queue: normal.",
    },
    {
      title: "Response drafted",
      detail: workflow.prediction.response_text,
    },
    {
      title: "Human approval",
      detail: "Waiting for demo approval before anything could be sent.",
    },
  ];
}

function snapshotSeed(seed: DemoMessageSeed): DemoMessageRecord {
  const cases = loadEvaluationCases();
  const sourceCase = cases[seed.case_index];
  if (!sourceCase) {
    throw new Error(`Missing evaluation case at index ${seed.case_index}`);
  }
  const workflow = runToolAssistedWorkflow({
    ...sourceCase.runnable,
    channel: sourceCase.runnable.channel,
    post_id: sourceCase.runnable.post_id,
    conversation: cloneConversation(sourceCase.runnable.conversation),
  });
  return {
    id: seed.id,
    scenario: seed.scenario,
    username: seed.username,
    channel: sourceCase.runnable.channel,
    timestamp: seed.timestamp,
    preview: previewOf(sourceCase.runnable.conversation),
    conversation: cloneConversation(sourceCase.runnable.conversation),
    post_id: sourceCase.runnable.post_id,
    source_case_index: seed.case_index,
    is_lead: workflow.prediction.is_lead,
    intent_labels: [...workflow.prediction.intent_labels],
    lead_state: workflow.prediction.is_lead ? "lead" : "non-lead",
    status: "new",
    approval_required: true,
    provisional_order: workflow.prediction.provisional_order,
    approval_note: null,
    ignore_reason: null,
    ignored_from_status: null,
    audit_trail: [],
    processed_at: null,
    result: null,
  };
}

function snapshotIncomingSeed(seedIndex: number): DemoMessageRecord {
  const template = SYNTHETIC_INCOMING_TEMPLATES[seedIndex % SYNTHETIC_INCOMING_TEMPLATES.length]!;
  const timestamp = new Date(Date.now() + seedIndex * 60000).toISOString();
  const conversation = template.conversation.map((entry) => ({ ...entry }));
  return {
    id: `demo-incoming-${String(seedIndex + 1).padStart(3, "0")}`,
    scenario: template.scenario,
    username: template.username,
    channel: template.channel,
    timestamp,
    preview: buildConversationPreview(conversation),
    conversation,
    post_id: template.post_id,
    source_case_index: template.case_index,
    is_lead: false,
    intent_labels: [],
    lead_state: "non-lead",
    status: "new",
    approval_required: true,
    provisional_order: false,
    approval_note: null,
    ignore_reason: null,
    ignored_from_status: null,
    audit_trail: [
      {
        at: timestamp,
        action: "analyze",
        note: "Synthetic incoming message added to the inbox.",
      },
    ],
    processed_at: null,
    result: null,
  };
}

export function createDemoMessages(): DemoMessageRecord[] {
  return DEMO_MESSAGE_SEEDS.map(snapshotSeed);
}

export function createDemoWorkflowSnapshot(message: DemoMessageRecord): DemoWorkflowSnapshot {
  const cases = loadEvaluationCases();
  const sourceCase = cases[message.source_case_index];
  if (!sourceCase) {
    throw new Error(`Missing evaluation case at index ${message.source_case_index}`);
  }
  const workflow = runToolAssistedWorkflow({
    ...sourceCase.runnable,
    channel: message.channel,
    post_id: message.post_id,
    conversation: cloneConversation(message.conversation),
  });
  const evidenceRefs = [...new Set(workflow.evidence_refs)];
  return {
    route: workflow.route,
    prediction: workflow.prediction,
    tool_calls: workflow.tool_calls,
    evidence_refs: evidenceRefs,
    evidence_items: buildEvidenceItems({ ...message, case_index: message.source_case_index }, workflow),
    trace: buildTrace(workflow),
    approval_queue: workflow.prediction.escalation ? "specialized" : "normal",
    escalation_required: workflow.prediction.escalation,
    escalation_reason: workflow.prediction.escalation ? workflow.prediction.action : null,
    draft: workflow.prediction.response_text,
    processed_at: new Date().toISOString(),
  };
}

export function readEvaluationCards(): DemoEvaluationCard[] {
  const baseline = readSummary("evaluation/results/baseline.json");
  const toolAssisted = readSummary("evaluation/results/tool-assisted.json");
  const modelMock = readSummary("evaluation/results/agent-mock.json");
  const hybridMock = readSummary("evaluation/results/agent-hybrid-mock.json");

  return [
    {
      label: "baseline",
      title: "Frozen baseline",
      score: baseline.primary_metric.score,
      passed_cases: baseline.primary_metric.passed_cases,
      total_cases: baseline.primary_metric.total_cases,
      note: "Deterministic starting point used as the stable lower bound.",
      path: "evaluation/results/baseline.json",
    },
    {
      label: "verified-tools",
      title: "Verified-tools core",
      score: toolAssisted.primary_metric.score,
      passed_cases: toolAssisted.primary_metric.passed_cases,
      total_cases: toolAssisted.primary_metric.total_cases,
      note: "Operational core used by the demo and the submitted workflow.",
      path: "evaluation/results/tool-assisted.json",
    },
    {
      label: "model-led-mock",
      title: "Model-led mock",
      score: modelMock.primary_metric.score,
      passed_cases: modelMock.primary_metric.passed_cases,
      total_cases: modelMock.primary_metric.total_cases,
      note: "Experimental mock evaluation for the model-driven agent path.",
      path: "evaluation/results/agent-mock.json",
    },
    {
      label: "guarded-hybrid-mock",
      title: "Guarded hybrid mock",
      score: hybridMock.primary_metric.score,
      passed_cases: hybridMock.primary_metric.passed_cases,
      total_cases: hybridMock.primary_metric.total_cases,
      note: "Deterministic policy boundary over the experimental hybrid path.",
      path: "evaluation/results/agent-hybrid-mock.json",
    },
  ];
}

export function summarizeMetrics(messages: DemoMessageRecord[]): {
  total_inbox_messages: number;
  unread_messages: number;
  open_messages: number;
  new_messages: number;
  awaiting_approval: number;
  needs_revision: number;
  specialized_review: number;
  resolved_messages: number;
  ignored_messages: number;
  qualified_leads: number;
  provisional_orders: number;
} {
  const countStatus = (status: DemoMessageRecord["status"]) => messages.filter((message) => message.status === status).length;
  const openStatuses: DemoMessageRecord["status"][] = ["new", "awaiting_approval", "needs_revision", "specialized_review"];
  return {
    total_inbox_messages: messages.length,
    unread_messages: countStatus("new"),
    open_messages: messages.filter((message) => openStatuses.includes(message.status)).length,
    new_messages: countStatus("new"),
    qualified_leads: messages.filter((message) => message.is_lead).length,
    awaiting_approval: countStatus("awaiting_approval"),
    needs_revision: countStatus("needs_revision"),
    specialized_review: countStatus("specialized_review"),
    resolved_messages: countStatus("resolved"),
    ignored_messages: countStatus("ignored"),
    provisional_orders: messages.filter((message) => message.provisional_order).length,
  };
}

export function createBootstrapPayload(messages: DemoMessageRecord[], selectedMessageId: string | null): DemoBootstrapPayload {
  return {
    messages,
    metrics: summarizeMetrics(messages),
    evaluation: readEvaluationCards(),
    selected_message_id: selectedMessageId,
    generated_at: new Date().toISOString(),
  };
}

export function createSyntheticIncomingMessage(seedIndex: number): DemoMessageRecord {
  return snapshotIncomingSeed(seedIndex);
}
