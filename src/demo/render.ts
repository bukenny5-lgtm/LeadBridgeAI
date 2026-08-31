import type { DemoBootstrapPayload, DemoDetailTab, DemoEvaluationCard, DemoListFilters, DemoMessageRecord, DemoNotificationStatus, DemoToastRecord, DemoWorkflowSnapshot } from "./types.js";

export interface DashboardViewModel {
  messages: DemoMessageRecord[];
  selected_message: DemoMessageRecord | null;
  filters: DemoListFilters;
  metrics: DemoBootstrapPayload["metrics"];
  evaluation: DemoEvaluationCard[];
  loading: boolean;
  error: string | null;
  detail_tab: DemoDetailTab;
  toasts: DemoToastRecord[];
  notification_status: DemoNotificationStatus;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function percent(score: number): string {
  return `${score.toFixed(2)}%`;
}

function channelLabel(channel: DemoMessageRecord["channel"]): string {
  switch (channel) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "email":
      return "Email";
    default:
      return channel;
  }
}

function statusLabel(status: DemoMessageRecord["status"]): string {
  switch (status) {
    case "new":
      return "New";
    case "awaiting_approval":
      return "Awaiting approval";
    case "needs_revision":
      return "Needs revision";
    case "specialized_review":
      return "Specialized review";
    case "resolved":
      return "Resolved";
    case "ignored":
      return "Ignored";
    default:
      return status;
  }
}

function statusFilterLabel(status: DemoListFilters["status"]): string {
  switch (status) {
    case "open":
      return "Open";
    case "all_messages":
      return "All messages";
    case "awaiting_approval":
      return "Awaiting approval";
    case "needs_revision":
      return "Needs revision";
    case "escalations":
      return "Escalations";
    case "resolved":
      return "Resolved";
    case "ignored":
      return "Ignored";
    case "new":
      return "New";
    default:
      return status;
  }
}

function statusTooltip(status: DemoListFilters["status"]): string {
  switch (status) {
    case "open":
      return "Unresolved work across all channels";
    case "new":
      return "Unprocessed or unread messages";
    case "awaiting_approval":
      return "Drafts waiting for a human decision";
    case "needs_revision":
      return "Messages sent back for re-analysis";
    case "escalations":
      return "Complaints or policy-sensitive cases";
    case "resolved":
      return "Completed or human-resolved messages";
    case "ignored":
      return "Messages stored in the ignored queue";
    case "all_messages":
      return "Every status in the selected channel";
    default:
      return status;
  }
}

function detailTabLabel(tab: DemoDetailTab): string {
  switch (tab) {
    case "overview":
      return "Overview";
    case "evidence":
      return "Evidence";
    case "trace":
      return "Audit trace";
    default:
      return tab;
  }
}

function isOpenStatus(status: DemoMessageRecord["status"]): boolean {
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

function filterBadgeLabel(filters: DemoListFilters): string {
  const parts = [filters.channel !== "all" ? channelLabel(filters.channel) : "All channels"];
  if (filters.status !== "open") {
    parts.push(statusFilterLabel(filters.status));
  }
  if (filters.search.trim()) {
    parts.push(`Search: ${filters.search.trim()}`);
  }
  return parts.join(" · ");
}

function countMessagesByStatus(messages: DemoMessageRecord[], status: DemoListFilters["status"], channel: DemoListFilters["channel"]): number {
  return filterMessages(messages, { channel, status, search: "" }).length;
}

function buildStatusCounts(messages: DemoMessageRecord[], channel: DemoListFilters["channel"]): Record<DemoListFilters["status"], number> {
  return {
    open: countMessagesByStatus(messages, "open", channel),
    new: countMessagesByStatus(messages, "new", channel),
    awaiting_approval: countMessagesByStatus(messages, "awaiting_approval", channel),
    needs_revision: countMessagesByStatus(messages, "needs_revision", channel),
    escalations: countMessagesByStatus(messages, "escalations", channel),
    resolved: countMessagesByStatus(messages, "resolved", channel),
    ignored: countMessagesByStatus(messages, "ignored", channel),
    all_messages: countMessagesByStatus(messages, "all_messages", channel),
  };
}

export function filterMessages(messages: DemoMessageRecord[], filters: DemoListFilters): DemoMessageRecord[] {
  const normalized = filters.search.trim().toLowerCase();
  return messages
    .filter((message) => filters.channel === "all" || message.channel === filters.channel)
    .filter((message) => matchesStatus(message, filters.status))
    .filter((message) => {
      if (!normalized) {
        return true;
      }
      const haystack = [
        message.username,
        message.channel,
        message.scenario,
        message.preview,
        message.intent_labels.join(" "),
        message.result?.draft ?? "",
        message.result?.prediction.action ?? "",
        message.result?.prediction.product_id ?? "",
        message.conversation.map((entry) => entry.text).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function renderBadges(message: DemoMessageRecord): string {
  const badges = [
    `<span class="chip channel-chip channel-${escapeHtml(message.channel)}" title="Channel">${escapeHtml(channelLabel(message.channel))}</span>`,
    `<span class="chip ${message.lead_state === "lead" ? "chip-lead" : "chip-muted"}" title="Qualification">${escapeHtml(message.lead_state === "lead" ? "Lead" : "Non-lead")}</span>`,
    `<span class="chip ${message.status === "awaiting_approval" ? "chip-warning" : message.status === "resolved" ? "chip-success" : message.status === "ignored" ? "chip-muted" : message.status === "needs_revision" ? "chip-danger" : "chip-muted"}" title="Workflow status">${escapeHtml(statusLabel(message.status))}</span>`,
  ];
  return badges.join("");
}

function renderConversation(message: DemoMessageRecord): string {
  return message.conversation
    .map((entry) => {
      const role = entry.role === "customer" ? "Customer" : "Agent";
      return `
        <div class="chat-bubble chat-${entry.role}">
          <div class="chat-meta">${escapeHtml(role)} · ${escapeHtml(entry.timestamp)}</div>
          <div class="chat-text">${escapeHtml(entry.text)}</div>
        </div>
      `;
    })
    .join("");
}

function dedupeEvidenceItems(items: DemoWorkflowSnapshot["evidence_items"]): DemoWorkflowSnapshot["evidence_items"] {
  const seen = new Set<string>();
  const deduped: DemoWorkflowSnapshot["evidence_items"] = [];
  for (const item of items) {
    const key = `${item.category}::${item.label}::${item.value}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function renderEvidenceItems(result: DemoWorkflowSnapshot | null): string {
  if (!result) {
    return `<div class="empty-state">Process the message to collect verified evidence.</div>`;
  }
  return dedupeEvidenceItems(result.evidence_items)
    .map((item) => {
      return `
        <div class="evidence-item evidence-${item.category}">
          <div class="evidence-label">${escapeHtml(item.label)}</div>
          <div class="evidence-value">${escapeHtml(item.value)}</div>
        </div>
      `;
    })
    .join("");
}

function renderTrace(result: DemoWorkflowSnapshot | null): string {
  if (!result) {
    return `<div class="empty-state">No trace yet. The workflow summary will appear after processing.</div>`;
  }
  return result.trace
    .map(
      (step, index) => `
        <div class="trace-step">
          <div class="trace-index">${index + 1}</div>
          <div>
            <div class="trace-title">${escapeHtml(step.title)}</div>
            <div class="trace-detail">${escapeHtml(step.detail)}</div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderEvaluationCards(cards: DemoEvaluationCard[]): string {
  return cards
    .map(
      (card) => `
        <article class="evaluation-card evaluation-${escapeHtml(card.label)}">
          <div class="evaluation-score">${percent(card.score)}</div>
          <h4>${escapeHtml(card.title)}</h4>
          <p>${escapeHtml(card.note)}</p>
          <div class="evaluation-footnote">${card.passed_cases}/${card.total_cases} cases · ${escapeHtml(card.path)}</div>
        </article>
      `,
    )
    .join("");
}

function renderMetricCard(label: string, value: number, filterValue: DemoListFilters["status"], filters: DemoListFilters, description: string): string {
  const isSelected = filters.status === filterValue;
  return `
    <button class="metric-card metric-card-action ${isSelected ? "is-selected" : ""}" data-action="set-filter-status" data-filter-value="${escapeHtml(filterValue)}" aria-label="${escapeHtml(`${label} ${value}`)}" title="${escapeHtml(description)}" aria-description="${escapeHtml(description)}">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${value}</div>
    </button>
  `;
}

function renderMessageList(messages: DemoMessageRecord[], selectedId: string | null): string {
  if (messages.length === 0) {
    return `<div class="empty-state">No messages match the current filters.</div>`;
  }
  return messages
    .map((message) => {
      const activeClass = message.id === selectedId ? "is-active" : "";
      return `
        <button class="message-row ${activeClass}" data-action="select-message" data-message-id="${escapeHtml(message.id)}" aria-current="${message.id === selectedId ? "true" : "false"}" title="${escapeHtml(`${channelLabel(message.channel)} · ${message.username}`)}">
          <div class="message-row-top">
            <div class="message-channel">${escapeHtml(channelLabel(message.channel))}</div>
            <div class="message-time">${escapeHtml(message.timestamp)}</div>
          </div>
          <div class="message-username">${escapeHtml(message.username)}</div>
          <div class="message-preview">${escapeHtml(message.preview)}</div>
          <div class="message-meta">
            ${renderBadges(message)}
          </div>
        </button>
      `;
    })
    .join("");
}

function renderOverviewContent(message: DemoMessageRecord): string {
  const result = message.result;
  const draft = result?.draft ?? "This message has not been processed yet.";
  const productLine = result?.prediction.product_id ? result.prediction.product_id : "No product association yet";
  const actionLine = result?.prediction.action ?? "Awaiting processing";
  const escalationLine = result?.escalation_required
    ? `Specialized review: ${escapeHtml(result.escalation_reason ?? "human review required")}`
    : "Normal approval queue";
  const orderFields = result?.prediction.order_fields?.length ? result.prediction.order_fields.join(", ") : "None";
  const auditSummary = message.audit_trail.at(-1);
  const approvalCopy =
    message.status === "resolved" && message.approval_note?.startsWith("Approved")
      ? "Approved in synthetic demo - not sent externally."
      : message.status === "resolved" && message.approval_note?.startsWith("Specialized review")
        ? "Specialized review resolved in synthetic demo."
        : message.status === "needs_revision"
          ? "Revision requested in synthetic demo. Re-analysis is still available."
          : message.status === "specialized_review"
            ? "Specialized review remains open until a human resolves it."
            : message.status === "ignored"
              ? `Ignored in synthetic demo${message.ignore_reason ? `: ${message.ignore_reason}` : ""}.`
              : "Approval required before any response could be sent.";

  return `
    <div class="detail-stack">
      <div class="detail-grid detail-overview-grid">
        <div class="detail-card">
          <div class="detail-label">Channel / account</div>
          <div class="detail-value">${escapeHtml(channelLabel(message.channel))} · ${escapeHtml(message.username)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Lead decision</div>
          <div class="detail-value">${escapeHtml(message.lead_state)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Intents</div>
          <div class="detail-value">${escapeHtml(message.intent_labels.join(", ") || "Pending processing")}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Product or clarification</div>
          <div class="detail-value">${escapeHtml(productLine)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Recommended action</div>
          <div class="detail-value">${escapeHtml(actionLine)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Approval / escalation</div>
          <div class="detail-value">${escapeHtml(statusLabel(message.status))}${result?.escalation_required ? ` · ${escapeHtml(escalationLine)}` : ""}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Provisional order</div>
          <div class="detail-value">${message.provisional_order ? "Yes" : "No"}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Lifecycle summary</div>
          <div class="detail-value">${escapeHtml(message.approval_required ? "Human review required" : "Ready")}</div>
        </div>
      </div>

      <div class="detail-card detail-conversation-card">
        <div class="detail-label">Conversation</div>
        <div class="chat-list conversation-scroll">${renderConversation(message)}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Draft</div>
        <div class="draft-block">${escapeHtml(draft)}</div>
      </div>

      <div class="detail-card detail-copy">${escapeHtml(approvalCopy)}</div>
      <div class="detail-card detail-copy">${escapeHtml(`Latest audit: ${auditSummary ? `${auditSummary.action} · ${auditSummary.note}` : "No audit events yet"}`)}</div>
      <div class="detail-card">
        <div class="detail-label">Order fields</div>
        <div class="detail-value">${escapeHtml(orderFields)}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Ignore reason</div>
        <div class="detail-value">${escapeHtml(message.ignore_reason ?? "None")}</div>
      </div>
    </div>
  `;
}

function renderEvidenceContent(message: DemoMessageRecord): string {
  return `
    <div class="detail-stack">
      <div class="detail-card detail-copy">Verified product, stock, delivery, location, image, and negotiation evidence stays sanitized and hidden from raw policy values.</div>
      <div class="evidence-grid">${renderEvidenceItems(message.result ?? null)}</div>
      <div class="detail-card detail-copy">Technical evidence references: ${escapeHtml(message.result?.evidence_refs.join(", ") || "None")}</div>
    </div>
  `;
}

function renderTraceContent(message: DemoMessageRecord): string {
  return `
    <div class="detail-stack">
      <div class="detail-card detail-copy">Technical evidence references: ${escapeHtml(message.result?.evidence_refs.join(", ") || "None")}</div>
      <div class="trace-list">${renderTrace(message.result ?? null)}</div>
    </div>
  `;
}

function renderDetailTabButton(tab: DemoDetailTab, activeTab: DemoDetailTab, messageId: string | null): string {
  const selected = tab === activeTab;
  return `
    <button
      class="tab-button ${selected ? "is-selected" : ""}"
      role="tab"
      aria-selected="${selected ? "true" : "false"}"
      aria-controls="detail-tabpanel"
      tabindex="${selected ? "0" : "-1"}"
      data-action="set-detail-tab"
      data-filter-value="${escapeHtml(tab)}"
      ${messageId ? `data-message-id="${escapeHtml(messageId)}"` : ""}
    >${escapeHtml(detailTabLabel(tab))}</button>
  `;
}

function renderDetail(message: DemoMessageRecord | null, activeTab: DemoDetailTab): string {
  if (!message) {
    return `
      <section class="panel panel-detail">
        <div class="empty-state">Choose a message from the inbox to inspect the workflow.</div>
      </section>
    `;
  }

  const result = message.result;
  const canApprove = Boolean(result) && message.status === "awaiting_approval";
  const canRequestRevision = Boolean(result) && message.status === "awaiting_approval";
  const canReanalyze = message.status === "new" || message.status === "awaiting_approval" || message.status === "needs_revision" || message.status === "specialized_review";
  const canResolveSpecializedReview = message.status === "specialized_review";
  const canIgnore = message.status !== "ignored" && message.status !== "resolved";
  const canRestore = message.status === "ignored";

  return `
    <section class="panel panel-detail">
      <div class="panel-head detail-head">
        <div>
          <div class="eyebrow">Message detail</div>
          <h3>${escapeHtml(message.scenario)}</h3>
        </div>
        <div class="detail-status">${escapeHtml(statusLabel(message.status))}</div>
      </div>

      <div class="detail-sticky">
        <div class="panel-actions detail-actions">
          ${canReanalyze ? `<button class="btn btn-secondary" data-action="process-message" data-message-id="${escapeHtml(message.id)}">${result ? "Re-analyze" : "Analyze message"}</button>` : ""}
          ${canApprove ? `<button class="btn btn-primary" data-action="approve-message" data-message-id="${escapeHtml(message.id)}">Approve in demo</button>` : ""}
          ${canRequestRevision ? `<button class="btn btn-danger" data-action="request-revision" data-message-id="${escapeHtml(message.id)}">Request revision</button>` : ""}
          ${canResolveSpecializedReview ? `<button class="btn btn-primary" data-action="resolve-message" data-message-id="${escapeHtml(message.id)}">Mark resolved</button>` : ""}
          ${canIgnore ? `<button class="btn btn-danger" data-action="ignore-message" data-message-id="${escapeHtml(message.id)}">Ignore</button>` : ""}
          ${canRestore ? `<button class="btn btn-secondary" data-action="restore-message" data-message-id="${escapeHtml(message.id)}">Restore to inbox</button>` : ""}
        </div>
        <div class="tab-strip" role="tablist" aria-label="Message detail tabs">
          ${renderDetailTabButton("overview", activeTab, message.id)}
          ${renderDetailTabButton("evidence", activeTab, message.id)}
          ${renderDetailTabButton("trace", activeTab, message.id)}
        </div>
      </div>

      <div id="detail-tabpanel" class="detail-body" role="tabpanel">
        ${activeTab === "evidence" ? renderEvidenceContent(message) : activeTab === "trace" ? renderTraceContent(message) : renderOverviewContent(message)}
      </div>
    </section>
  `;
}

function renderToastStack(toasts: DemoToastRecord[]): string {
  if (toasts.length === 0) {
    return "";
  }
  return `
    <div class="toast-stack" aria-live="polite" aria-relevant="additions removals">
      ${toasts
        .map(
          (toast) => `
            <article class="toast-card">
              <div class="toast-top">
                <div>
                  <div class="toast-title">${escapeHtml(toast.title)}</div>
                  <div class="toast-meta">${escapeHtml(channelLabel(toast.channel))} · ${escapeHtml(toast.username)}</div>
                </div>
                <button class="toast-close" data-action="dismiss-toast" data-message-id="${escapeHtml(toast.message_id)}" aria-label="Dismiss notification">×</button>
              </div>
              <div class="toast-body">${escapeHtml(toast.body)}</div>
              <div class="toast-actions">
                <button class="btn btn-primary" data-action="open-toasted-message" data-message-id="${escapeHtml(toast.message_id)}">Open</button>
                <button class="btn btn-secondary" data-action="dismiss-toast" data-message-id="${escapeHtml(toast.message_id)}">Dismiss</button>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderEvaluationPanel(cards: DemoEvaluationCard[]): string {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Evaluation</div>
          <h3>Improvement from 20% to 60%</h3>
        </div>
        <div class="evaluation-copy">Primary score uses strict all-applicable-requirements scoring.</div>
      </div>
      <div class="evaluation-grid">${renderEvaluationCards(cards)}</div>
      <div class="evaluation-note">
        Verified-tools is the operational core. The model-led and guarded-hybrid scores remain experimental mock evaluations. Live platform and full live-model testing are outside this synthetic demo.
      </div>
    </section>
  `;
}

function renderSummary(metrics: DemoBootstrapPayload["metrics"], filters: DemoListFilters, counts: Record<DemoListFilters["status"], number>): string {
  const items = [
    ["Open", counts.open, "open", "Unresolved work across all channels"],
    ["New", counts.new, "new", "Unprocessed or unread messages"],
    ["Awaiting approval", counts.awaiting_approval, "awaiting_approval", "Drafts waiting for a human decision"],
    ["Needs revision", counts.needs_revision, "needs_revision", "Messages sent back for re-analysis"],
    ["Escalations", counts.escalations, "escalations", "Complaints or policy-sensitive cases"],
    ["Resolved", counts.resolved, "resolved", "Completed or human-resolved messages"],
    ["Ignored", counts.ignored, "ignored", "Messages stored in the ignored queue"],
    ["All messages", counts.all_messages, "all_messages", "Every status in the selected channel"],
  ];
  return items
    .map(
      ([label, value, filterValue, description]) => renderMetricCard(String(label), Number(value), filterValue as DemoListFilters["status"], filters, String(description)),
    )
    .join("");
}

function renderStatusButton(label: string, value: DemoListFilters["status"], count: number, filters: DemoListFilters): string {
  const selected = filters.status === value;
  return `
    <button class="chip-toggle ${selected ? "is-selected" : ""}" data-action="set-filter-status" data-filter-value="${escapeHtml(value)}" aria-label="${escapeHtml(`${label} ${count}`)}" title="${escapeHtml(statusTooltip(value))}">
      <span>${escapeHtml(label)}</span>
      <span class="chip-count">${count}</span>
    </button>
  `;
}

function renderFilters(filters: DemoListFilters, counts: Record<DemoListFilters["status"], number>): string {
  const channelButtons = [
    ["all", "All channels"],
    ["facebook", "Facebook"],
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["email", "Email"],
  ] as const;
  const bucketButtons = [
    ["open", "Open"],
    ["new", "New"],
    ["awaiting_approval", "Awaiting approval"],
    ["needs_revision", "Needs revision"],
    ["escalations", "Escalations"],
    ["resolved", "Resolved"],
    ["ignored", "Ignored"],
    ["all_messages", "All messages"],
  ] as const;

  return `
    <section class="panel panel-filters">
      <div class="filters-header">
        <div class="eyebrow">Filters</div>
        <div class="filter-summary">${escapeHtml(filterBadgeLabel(filters))}</div>
      </div>
      <div class="filters-row">
        <label class="search-field">
          <span>Search</span>
          <input id="demo-search" type="search" value="${escapeHtml(filters.search)}" placeholder="Search messages, intents, products" data-action="search-input" />
        </label>
        <div class="chip-row">
          ${channelButtons
            .map(
              ([value, label]) => `
                <button class="chip-toggle ${filters.channel === value ? "is-selected" : ""}" data-action="set-filter-channel" data-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>
              `,
            )
            .join("")}
        </div>
        <div class="chip-row">
          ${bucketButtons
            .map(
              ([value, label]) => `
                ${renderStatusButton(label, value, counts[value], filters)}
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

export function renderDashboardBody(viewModel: DashboardViewModel): string {
  const filteredMessages = filterMessages(viewModel.messages, viewModel.filters);
  const statusCounts = buildStatusCounts(viewModel.messages, viewModel.filters.channel);
  const selectedMessage = viewModel.selected_message && filteredMessages.some((message) => message.id === viewModel.selected_message?.id)
    ? viewModel.selected_message
    : filteredMessages[0] ?? viewModel.selected_message ?? null;

  return `
    <div class="shell">
      <header class="hero">
        <div class="hero-copy">
          <div class="eyebrow-row">
            <span class="badge badge-primary">Synthetic Demo</span>
            <span class="badge badge-secondary">Verified-Tools Core</span>
          </div>
          <h1>LeadBridge AI</h1>
          <p class="hero-text">Synthetic demo · Verified tools · Human approval required · Nothing is automatically sent.</p>
          <div class="hero-note">Compact workflow view for inbox triage, approval, and audit review.</div>
        </div>
        <div class="hero-status">
          <div class="hero-actions">
            <button class="btn btn-secondary hero-action" data-action="open-alerts" aria-label="Open new messages">Alerts <span class="badge-count">${statusCounts.new}</span></button>
            <button class="btn btn-secondary hero-action" data-action="enable-browser-alerts">Enable browser alerts</button>
            <button class="btn btn-primary hero-action" data-action="simulate-incoming-message">Simulate incoming message</button>
          </div>
          <div class="status-pill">Runtime ${escapeHtml(viewModel.loading ? "loading..." : "ready")}</div>
          <div class="status-pill status-pill-muted">Human approval before send · no external delivery</div>
          ${viewModel.notification_status.explanation ? `<div class="hero-note hero-note-soft">${escapeHtml(viewModel.notification_status.explanation)}</div>` : ""}
        </div>
      </header>

      ${viewModel.error ? `<section class="panel panel-error">${escapeHtml(viewModel.error)}</section>` : ""}

      <section class="summary-grid kpi-strip">
        ${renderSummary(viewModel.metrics, viewModel.filters, statusCounts)}
      </section>

      ${renderFilters(viewModel.filters, statusCounts)}

      <section class="inbox-layout">
        <aside class="panel panel-inbox">
          <div class="panel-head">
            <div>
              <div class="eyebrow">Unified inbox</div>
              <h3>Representative synthetic messages</h3>
              <div class="inbox-legend">
                <span>Channel</span>
                <span>Qualification</span>
                <span>Workflow status</span>
              </div>
            </div>
            <div class="panel-copy">${filteredMessages.length} visible</div>
          </div>
          <div class="message-list">
            ${renderMessageList(filteredMessages, selectedMessage?.id ?? null)}
          </div>
        </aside>
        <div class="detail-column">
          ${renderDetail(selectedMessage, viewModel.detail_tab)}
        </div>
      </section>

      ${renderEvaluationPanel(viewModel.evaluation)}
      ${renderToastStack(viewModel.toasts)}
    </div>
  `;
}

export function renderDashboardShell(bootstrapJson: string): string {
  const safeBootstrapJson = bootstrapJson.replace(/</g, "\\u003c");
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>LeadBridge AI Synthetic Demo</title>
      <style>
        :root {
          color-scheme: dark;
          --bg: #0d1724;
          --bg-alt: #132033;
          --surface: #f7f9fc;
          --surface-soft: #eef3f8;
          --text: #132033;
          --text-soft: #58687d;
          --accent: #2f80ed;
          --accent-strong: #1965d1;
          --accent-green: #2ea97d;
          --accent-amber: #d49b1d;
          --accent-red: #d34c4c;
          --border: rgba(19, 32, 51, 0.12);
          --shadow: 0 24px 60px rgba(6, 16, 29, 0.22);
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(47, 128, 237, 0.16), transparent 28%),
            radial-gradient(circle at top right, rgba(46, 169, 125, 0.12), transparent 28%),
            linear-gradient(180deg, #0b1420 0%, #0d1724 38%, #101c2b 100%);
          color: #eef4fb;
        }
        button, input { font: inherit; }
        .shell { max-width: 1780px; margin: 0 auto; padding: 18px 18px 26px; }
        .hero, .panel, .metric-card { border: 1px solid rgba(255,255,255,0.08); box-shadow: var(--shadow); }
        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 16px 18px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(19, 32, 51, 0.96), rgba(13, 23, 36, 0.92));
          margin-bottom: 12px;
        }
        .hero h1 { margin: 8px 0 4px; font-size: clamp(1.8rem, 3vw, 2.6rem); letter-spacing: -0.03em; }
        .hero-text { margin: 0; color: rgba(238, 244, 251, 0.84); max-width: 72ch; font-size: 0.98rem; line-height: 1.5; }
        .hero-note { margin-top: 8px; color: rgba(238, 244, 251, 0.7); font-size: 0.88rem; line-height: 1.45; }
        .hero-note-soft { max-width: 34ch; text-align: right; }
        .eyebrow-row, .filters-header, .panel-head, .message-row-top, .filters-row, .trace-step, .chat-bubble, .stack, .chip-row, .message-meta { display: flex; }
        .eyebrow { color: rgba(19, 32, 51, 0.7); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; }
        .eyebrow-row, .filters-header, .panel-head, .message-row-top, .trace-step { justify-content: space-between; align-items: center; }
        .hero-status { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; min-width: min(100%, 460px); }
        .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .hero-action { min-height: 44px; }
        .badge-count, .chip-count {
          display: inline-grid;
          place-items: center;
          min-width: 1.6rem;
          height: 1.6rem;
          padding: 0 0.45rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          margin-left: 8px;
          font-size: 0.76rem;
          font-weight: 800;
        }
        .chip-count { margin-left: 10px; background: rgba(47, 128, 237, 0.12); color: var(--accent-strong); }
        .badge, .status-pill, .chip, .chip-toggle {
          border-radius: 999px;
          padding: 0.5rem 0.8rem;
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 0.78rem;
          font-weight: 700;
        }
        .badge-primary { background: rgba(47, 128, 237, 0.18); color: #ddebff; }
        .badge-secondary { background: rgba(46, 169, 125, 0.18); color: #dbfff0; }
        .status-pill { background: rgba(255,255,255,0.08); color: #f4f7fb; }
        .status-pill-muted { color: rgba(238, 244, 251, 0.78); }
        .summary-grid {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(132px, 1fr);
          gap: 10px;
          margin-bottom: 12px;
          overflow-x: auto;
          padding-bottom: 6px;
          scrollbar-width: thin;
        }
        .metric-card {
          min-width: 0;
          padding: 14px 14px 12px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(243,247,252,0.95));
          color: var(--text);
        }
        .metric-card-action {
          text-align: left;
          cursor: pointer;
          border: 1px solid var(--border);
          appearance: none;
        }
        .metric-card-action.is-selected {
          border-color: rgba(47, 128, 237, 0.45);
          box-shadow: 0 0 0 3px rgba(47, 128, 237, 0.12);
        }
        .metric-label { color: var(--text-soft); font-size: 0.84rem; margin-bottom: 4px; }
        .metric-value { font-size: clamp(1.5rem, 2vw, 2rem); font-weight: 800; letter-spacing: -0.04em; }
        .panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,249,252,0.98));
          color: var(--text);
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .panel-head { gap: 12px; align-items: flex-start; margin-bottom: 10px; }
        .panel h3 { margin: 4px 0 0; font-size: 1.15rem; }
        .panel-copy, .filter-summary, .evaluation-copy, .evidence-note, .evaluation-note { color: var(--text-soft); font-size: 0.92rem; line-height: 1.45; }
        .panel-error { border-color: rgba(211, 76, 76, 0.32); background: rgba(255, 247, 247, 0.98); color: #862626; }
        .panel-filters { padding-bottom: 14px; }
        .filters-row { gap: 12px; flex-wrap: wrap; align-items: flex-start; }
        .search-field { display: flex; flex-direction: column; gap: 8px; min-width: min(100%, 360px); flex: 1 1 360px; color: var(--text-soft); }
        .search-field input {
          border-radius: 14px;
          border: 1px solid var(--border);
          padding: 12px 14px;
          background: #fff;
          color: var(--text);
          min-height: 44px;
        }
        .chip-row { gap: 8px; flex-wrap: wrap; }
        .chip-toggle, .btn {
          background: #fff;
          color: var(--text);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .chip-toggle:hover, .btn:hover { transform: translateY(-1px); }
        .chip-toggle { min-height: 42px; display: inline-flex; align-items: center; gap: 0.35rem; }
        .chip-toggle.is-selected { background: rgba(47, 128, 237, 0.12); border-color: rgba(47, 128, 237, 0.4); color: var(--accent-strong); }
        .chip { display: inline-flex; align-items: center; margin-right: 6px; margin-bottom: 6px; background: rgba(239, 244, 249, 0.9); color: var(--text); min-height: 34px; }
        .chip-lead { background: rgba(46, 169, 125, 0.16); color: #1d7f5d; }
        .chip-muted { background: rgba(88, 104, 125, 0.12); color: var(--text-soft); }
        .chip-warning { background: rgba(212, 155, 29, 0.18); color: #a67109; }
        .chip-danger { background: rgba(211, 76, 76, 0.16); color: #b93f3f; }
        .channel-facebook { background: rgba(24, 119, 242, 0.12); color: #1963d1; }
        .channel-instagram { background: rgba(219, 54, 149, 0.12); color: #be2575; }
        .channel-tiktok { background: rgba(16, 24, 40, 0.08); color: #0f1728; }
        .channel-email { background: rgba(46, 169, 125, 0.12); color: #1d7f5d; }
        .inbox-layout { display: grid; gap: 14px; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.15fr); align-items: stretch; }
        .panel-inbox { min-height: 0; height: clamp(480px, calc(100vh - 365px), 760px); display: flex; flex-direction: column; }
        .message-list { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow: auto; padding-right: 4px; }
        .message-row {
          width: 100%;
          text-align: left;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: #fff;
          padding: 12px;
          cursor: pointer;
          transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
        }
        .message-row:hover, .message-row.is-active { transform: translateY(-1px); border-color: rgba(47, 128, 237, 0.5); box-shadow: 0 16px 30px rgba(17, 32, 51, 0.08); }
        .message-channel { font-weight: 700; color: var(--accent-strong); }
        .message-time, .message-preview, .message-meta, .chat-meta, .detail-label, .trace-detail, .evaluation-footnote { color: var(--text-soft); }
        .message-username { font-weight: 700; margin-top: 8px; overflow-wrap: anywhere; }
        .message-preview { margin-top: 6px; line-height: 1.5; overflow-wrap: anywhere; }
        .message-meta { margin-top: 10px; flex-wrap: wrap; }
        .detail-column { min-width: 0; height: clamp(480px, calc(100vh - 365px), 760px); }
        .panel-detail { height: 100%; display: flex; flex-direction: column; margin-bottom: 0; }
        .detail-head { margin-bottom: 8px; }
        .detail-status { align-self: flex-start; padding: 0.45rem 0.7rem; border-radius: 999px; background: rgba(47, 128, 237, 0.08); color: var(--accent-strong); font-weight: 700; font-size: 0.82rem; }
        .detail-sticky { position: sticky; top: 0; z-index: 2; background: linear-gradient(180deg, rgba(248,250,252,0.98), rgba(248,250,252,0.96)); padding-bottom: 10px; }
        .detail-actions { margin-bottom: 10px; }
        .tab-strip { display: flex; gap: 8px; flex-wrap: wrap; }
        .tab-button {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          padding: 0.55rem 0.85rem;
          cursor: pointer;
          font-weight: 700;
        }
        .tab-button.is-selected { background: rgba(47, 128, 237, 0.12); border-color: rgba(47, 128, 237, 0.35); color: var(--accent-strong); }
        .detail-body { overflow: auto; min-height: 0; padding-right: 4px; }
        .detail-stack { display: grid; gap: 12px; }
        .detail-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .detail-conversation-card { min-height: 0; }
        .conversation-scroll { max-height: 220px; overflow: auto; padding-right: 4px; }
        .detail-card, .panel-subcard, .evidence-item, .evaluation-card {
          border-radius: 16px;
          border: 1px solid var(--border);
          background: #fff;
          padding: 12px;
        }
        .detail-card { display: flex; flex-direction: column; gap: 6px; }
        .detail-value { font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
        .detail-copy { background: rgba(47, 128, 237, 0.06); color: #1b3255; }
        .panel-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { border-radius: 14px; padding: 10px 14px; font-weight: 700; min-height: 42px; }
        .btn-primary { background: rgba(47, 128, 237, 0.12); color: var(--accent-strong); }
        .btn-secondary { background: rgba(46, 169, 125, 0.12); color: #1d7f5d; }
        .btn-danger { background: rgba(211, 76, 76, 0.1); color: #b93f3f; }
        .chat-list, .trace-list, .evidence-grid, .evaluation-grid { display: grid; gap: 10px; }
        .chat-bubble { flex-direction: column; gap: 4px; border-radius: 16px; padding: 12px; }
        .chat-customer { background: rgba(47, 128, 237, 0.08); }
        .chat-agent { background: rgba(46, 169, 125, 0.08); }
        .chat-text { color: #132033; line-height: 1.55; overflow-wrap: anywhere; }
        .draft-block { color: #132033; line-height: 1.55; font-weight: 600; overflow-wrap: anywhere; }
        .empty-state {
          border: 1px dashed rgba(88, 104, 125, 0.3);
          border-radius: 16px;
          padding: 18px;
          color: var(--text-soft);
          background: rgba(255,255,255,0.62);
        }
        .evidence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .evidence-item { min-height: 96px; }
        .evidence-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-strong); font-weight: 700; margin-bottom: 8px; }
        .evidence-value { line-height: 1.5; font-weight: 600; color: #132033; overflow-wrap: anywhere; }
        .evidence-customer { background: rgba(47, 128, 237, 0.06); }
        .evidence-verified { background: rgba(46, 169, 125, 0.08); }
        .evidence-inferred { background: rgba(212, 155, 29, 0.09); }
        .evidence-missing { background: rgba(211, 76, 76, 0.08); }
        .trace-list { grid-template-columns: 1fr; }
        .trace-step {
          gap: 12px;
          align-items: flex-start;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
        }
        .trace-index {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(47, 128, 237, 0.12);
          color: var(--accent-strong);
          display: grid;
          place-items: center;
          font-weight: 800;
          flex: none;
        }
        .trace-title { font-weight: 800; margin-bottom: 3px; }
        .evaluation-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .evaluation-card h4 { margin: 0 0 8px; }
        .evaluation-score { font-size: 1.8rem; font-weight: 800; color: var(--accent-strong); margin-bottom: 10px; }
        .evaluation-card p { margin: 0 0 12px; color: var(--text-soft); line-height: 1.5; }
        .evaluation-footnote { font-size: 0.84rem; }
        .evaluation-note, .evidence-note { margin-top: 12px; }
        .kpi-strip { align-items: stretch; }
        .inbox-legend { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; color: var(--text-soft); font-size: 0.84rem; }
        .inbox-legend span { padding: 0.3rem 0.55rem; border-radius: 999px; background: rgba(88, 104, 125, 0.08); }
        .toast-stack {
          position: fixed;
          right: 18px;
          bottom: 18px;
          display: grid;
          gap: 10px;
          width: min(380px, calc(100vw - 36px));
          z-index: 40;
        }
        .toast-card {
          background: rgba(19, 32, 51, 0.98);
          color: #eef4fb;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          padding: 14px;
          box-shadow: var(--shadow);
        }
        .toast-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .toast-title { font-weight: 800; font-size: 0.98rem; }
        .toast-meta, .toast-body { color: rgba(238, 244, 251, 0.8); font-size: 0.9rem; line-height: 1.45; }
        .toast-body { margin: 8px 0 12px; }
        .toast-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .toast-close {
          border: 0;
          background: transparent;
          color: rgba(238, 244, 251, 0.88);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.1rem 0.3rem;
        }
        @media (max-width: 1200px) {
          .inbox-layout, .detail-overview-grid, .evaluation-grid { grid-template-columns: 1fr; }
          .detail-column, .panel-inbox { height: auto; }
        }
        @media (max-width: 760px) {
          .shell { padding: 12px; }
          .hero { flex-direction: column; }
          .hero-status { align-items: flex-start; }
          .panel-actions { width: 100%; }
          .panel-actions .btn { flex: 1 1 100%; }
          .message-row { padding: 12px; }
          .evidence-grid { grid-template-columns: 1fr; }
          .summary-grid { grid-auto-columns: minmax(128px, 72vw); }
          .toast-stack { left: 12px; right: 12px; width: auto; }
        }
      </style>
    </head>
    <body>
      <div id="app-root"></div>
      <script id="bootstrap-data" type="application/json">${safeBootstrapJson}</script>
      <script type="module" src="/assets/client.js"></script>
    </body>
  </html>`;
}
