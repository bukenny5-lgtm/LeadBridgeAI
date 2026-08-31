import type { Channel, ConversationMessage } from "../shared/types.js";
import type { Prediction } from "../evaluation/case-schema.js";
import type { ToolTraceRecord } from "../tools/verified-tools.js";

export type DemoScenario =
  | "price inquiry"
  | "availability inquiry"
  | "image request"
  | "delivery question"
  | "location question"
  | "negotiation"
  | "confirmed order"
  | "complaint"
  | "spam"
  | "prompt injection"
  | "phone handoff"
  | "inventory and delivery";

export type DemoLifecycleStatus =
  | "new"
  | "awaiting_approval"
  | "needs_revision"
  | "specialized_review"
  | "resolved"
  | "ignored";

export type DemoStatusFilter =
  | "open"
  | "new"
  | "awaiting_approval"
  | "needs_revision"
  | "escalations"
  | "resolved"
  | "ignored"
  | "all_messages";

export type DemoLifecycleAction = "analyze" | "approve" | "request_revision" | "mark_resolved" | "ignore" | "restore";

export type DemoDetailTab = "overview" | "evidence" | "trace";

export interface DemoAuditEvent {
  at: string;
  action: DemoLifecycleAction;
  note: string;
}

export interface DemoMessageSeed {
  id: string;
  scenario: DemoScenario;
  username: string;
  channel: Channel;
  timestamp: string;
  post_id: string | null;
  case_index: number;
}

export interface DemoEvidenceItem {
  category: "customer" | "inferred" | "verified" | "missing";
  label: string;
  value: string;
}

export interface DemoWorkflowSnapshot {
  route: string;
  prediction: Prediction;
  tool_calls: ToolTraceRecord[];
  evidence_refs: string[];
  evidence_items: DemoEvidenceItem[];
  trace: DemoTraceStep[];
  approval_queue: "normal" | "specialized";
  escalation_required: boolean;
  escalation_reason: string | null;
  draft: string;
  processed_at: string;
}

export interface DemoTraceStep {
  title: string;
  detail: string;
}

export interface DemoMessageRecord {
  id: string;
  scenario: DemoScenario;
  username: string;
  channel: Channel;
  timestamp: string;
  preview: string;
  conversation: ConversationMessage[];
  post_id: string | null;
  source_case_index: number;
  is_lead: boolean;
  intent_labels: string[];
  lead_state: "lead" | "non-lead";
  status: DemoLifecycleStatus;
  approval_required: boolean;
  provisional_order: boolean;
  approval_note: string | null;
  ignore_reason: string | null;
  ignored_from_status: "new" | "awaiting_approval" | "needs_revision" | "specialized_review" | null;
  audit_trail: DemoAuditEvent[];
  processed_at: string | null;
  result: DemoWorkflowSnapshot | null;
}

export interface DemoMetrics {
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
}

export interface DemoEvaluationCard {
  label: string;
  title: string;
  score: number;
  passed_cases: number;
  total_cases: number;
  note: string;
  path: string;
}

export interface DemoBootstrapPayload {
  messages: DemoMessageRecord[];
  metrics: DemoMetrics;
  evaluation: DemoEvaluationCard[];
  selected_message_id: string | null;
  generated_at: string;
}

export interface DemoListFilters {
  channel: "all" | "facebook" | "instagram" | "tiktok" | "email";
  status: DemoStatusFilter;
  search: string;
}

export interface DemoToastRecord {
  id: string;
  message_id: string;
  channel: DemoMessageRecord["channel"];
  username: string;
  preview: string;
  title: string;
  body: string;
  created_at: string;
}

export interface DemoNotificationStatus {
  permission: "default" | "granted" | "denied" | "unsupported";
  supported: boolean;
  explanation: string | null;
}
