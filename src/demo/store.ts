import { createBootstrapPayload, createDemoMessages, createDemoWorkflowSnapshot, createSyntheticIncomingMessage, readEvaluationCards, summarizeMetrics } from "./data.js";
import type { DemoBootstrapPayload, DemoListFilters, DemoLifecycleStatus, DemoMessageRecord, DemoMetrics } from "./types.js";

export interface DemoStoreSnapshot {
  messages: DemoMessageRecord[];
  metrics: DemoMetrics;
  evaluation: DemoBootstrapPayload["evaluation"];
  selected_message_id: string | null;
}

export interface DemoActionResult {
  message: DemoMessageRecord;
  metrics: DemoMetrics;
}

function cloneMessage(message: DemoMessageRecord): DemoMessageRecord {
  return JSON.parse(JSON.stringify(message)) as DemoMessageRecord;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(message: DemoMessageRecord, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  const needle = normalize(search);
  const haystack = normalize(
    [
      message.username,
      message.channel,
      message.scenario,
      message.preview,
      message.intent_labels.join(" "),
      message.result?.draft ?? "",
      message.result?.prediction.action ?? "",
      message.result?.prediction.product_id ?? "",
      message.conversation.map((entry) => entry.text).join(" "),
    ].join(" "),
  );
  return haystack.includes(needle);
}

function isOpenStatus(status: DemoLifecycleStatus): boolean {
  return status === "new" || status === "awaiting_approval" || status === "needs_revision" || status === "specialized_review";
}

function matchesStatus(message: DemoMessageRecord, status: DemoListFilters["status"]): boolean {
  if (status === "all_messages") return true;
  if (status === "open") return isOpenStatus(message.status);
  if (status === "new") return message.status === "new";
  if (status === "awaiting_approval") return message.status === "awaiting_approval";
  if (status === "needs_revision") return message.status === "needs_revision";
  if (status === "escalations") return message.status === "specialized_review";
  if (status === "resolved") return message.status === "resolved";
  if (status === "ignored") return message.status === "ignored";
  return true;
}

function matchesChannel(message: DemoMessageRecord, channel: DemoListFilters["channel"]): boolean {
  return channel === "all" || message.channel === channel;
}

function computeMetrics(messages: DemoMessageRecord[]): DemoMetrics {
  return summarizeMetrics(messages);
}

function appendAudit(message: DemoMessageRecord, action: DemoMessageRecord["audit_trail"][number]["action"], note: string): DemoMessageRecord["audit_trail"] {
  return [...message.audit_trail, { at: new Date().toISOString(), action, note }];
}

export class DemoStore {
  private messages: DemoMessageRecord[];

  private readonly evaluation = readEvaluationCards();

  private selectedMessageId: string | null;

  private nextIncomingSeedIndex = 0;

  constructor() {
    this.messages = createDemoMessages();
    this.selectedMessageId = this.messages[0]?.id ?? null;
    this.seedProcessedMessages(["demo-001", "demo-008", "demo-012"]);
  }

  private seedProcessedMessages(messageIds: string[]): void {
    for (const id of messageIds) {
      const message = this.messages.find((entry) => entry.id === id);
      if (message) {
        this.processMessageInternal(message);
      }
    }
  }

  listMessages(filters: DemoListFilters): DemoMessageRecord[] {
    return this.messages
      .filter((message) => matchesChannel(message, filters.channel))
      .filter((message) => matchesStatus(message, filters.status))
      .filter((message) => matchesSearch(message, filters.search))
      .map(cloneMessage)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  getSnapshot(): DemoStoreSnapshot {
    return {
      messages: this.messages.map(cloneMessage),
      metrics: computeMetrics(this.messages),
      evaluation: this.evaluation,
      selected_message_id: this.selectedMessageId,
    };
  }

  getSelectedMessageId(): string | null {
    return this.selectedMessageId;
  }

  selectMessage(messageId: string): DemoMessageRecord {
    const message = this.getMessageOrThrow(messageId);
    this.selectedMessageId = messageId;
    return cloneMessage(message);
  }

  getMessage(messageId: string): DemoMessageRecord | null {
    const message = this.messages.find((entry) => entry.id === messageId);
    return message ? cloneMessage(message) : null;
  }

  processMessage(messageId: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (message.status === "ignored") {
      throw new Error("ignored messages must be restored before re-analysis");
    }
    const processed = this.processMessageInternal(message);
    return {
      message: cloneMessage(processed),
      metrics: computeMetrics(this.messages),
    };
  }

  approveMessage(messageId: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (!message.result) {
      throw new Error("message must be processed before approval");
    }
    if (message.status !== "awaiting_approval") {
      throw new Error("message must be awaiting approval before approval");
    }
    message.status = "resolved";
    message.approval_note = "Approved in synthetic demo - not sent externally.";
    message.audit_trail = appendAudit(message, "approve", "Approved in synthetic demo - not sent externally.");
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  requestRevision(messageId: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (!message.result) {
      throw new Error("message must be processed before requesting revision");
    }
    if (message.status !== "awaiting_approval") {
      throw new Error("message must be awaiting approval before revision is requested");
    }
    message.status = "needs_revision";
    message.approval_note = "Revision requested in synthetic demo.";
    message.audit_trail = appendAudit(message, "request_revision", "Revision requested in synthetic demo.");
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  resolveSpecializedReview(messageId: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (message.status !== "specialized_review") {
      throw new Error("message must be under specialized review before it can be resolved");
    }
    message.status = "resolved";
    message.approval_note = "Specialized review resolved in synthetic demo.";
    message.audit_trail = appendAudit(message, "mark_resolved", "Specialized review resolved in synthetic demo.");
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  ignoreMessage(messageId: string, reason: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (!reason.trim()) {
      throw new Error("ignore reason is required");
    }
    const previousStatus = message.status;
    if (!isOpenStatus(previousStatus)) {
      throw new Error("only open messages can be ignored");
    }
    message.ignored_from_status = previousStatus as DemoMessageRecord["ignored_from_status"];
    message.status = "ignored";
    message.ignore_reason = reason.trim();
    message.approval_note = null;
    message.audit_trail = appendAudit(message, "ignore", `Ignored in synthetic demo: ${reason.trim()}`);
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  restoreMessage(messageId: string): DemoActionResult {
    const message = this.getMessageOrThrow(messageId);
    if (message.status !== "ignored") {
      throw new Error("message must be ignored before it can be restored");
    }
    const restoreStatus = message.ignored_from_status ?? "new";
    message.status = restoreStatus;
    message.ignored_from_status = null;
    message.ignore_reason = null;
    message.approval_note = null;
    message.audit_trail = appendAudit(message, "restore", "Restored to inbox from ignored state.");
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  simulateIncomingMessage(): DemoActionResult {
    const message = createSyntheticIncomingMessage(this.nextIncomingSeedIndex);
    this.nextIncomingSeedIndex += 1;
    this.messages.push(message);
    return {
      message: cloneMessage(message),
      metrics: computeMetrics(this.messages),
    };
  }

  createBootstrap(): DemoBootstrapPayload {
    return createBootstrapPayload(this.messages.map(cloneMessage), this.selectedMessageId);
  }

  private processMessageInternal(message: DemoMessageRecord): DemoMessageRecord {
    const workflow = createDemoWorkflowSnapshot(message);
    message.result = workflow;
    message.processed_at = workflow.processed_at;
    message.approval_required = true;
    message.approval_note = null;
    message.ignore_reason = null;
    message.ignored_from_status = null;
    message.audit_trail = appendAudit(message, "analyze", workflow.escalation_required ? "Escalation routed to specialized review." : "Draft ready for normal approval.");
    message.is_lead = workflow.prediction.is_lead;
    message.intent_labels = [...workflow.prediction.intent_labels];
    message.lead_state = workflow.prediction.is_lead ? "lead" : "non-lead";
    message.provisional_order = workflow.prediction.provisional_order;
    message.status = workflow.prediction.escalation ? "specialized_review" : "awaiting_approval";
    return message;
  }

  private getMessageOrThrow(messageId: string): DemoMessageRecord {
    const message = this.messages.find((entry) => entry.id === messageId);
    if (!message) {
      throw new Error(`Unknown message id: ${messageId}`);
    }
    return message;
  }
}
