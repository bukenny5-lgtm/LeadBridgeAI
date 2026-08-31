import { createToastFromMessage, getNotificationStatus, requestBrowserNotificationPermission, showSyntheticBrowserNotification } from "./alerts.js";
import { renderDashboardBody, filterMessages } from "./render.js";
import type { DemoBootstrapPayload, DemoDetailTab, DemoListFilters, DemoMessageRecord, DemoNotificationStatus, DemoToastRecord } from "./types.js";

interface AppWindow extends Window {
  __LEADBRIDGE_BOOTSTRAP__?: DemoBootstrapPayload;
}

interface AppState {
  messages: DemoMessageRecord[];
  metrics: DemoBootstrapPayload["metrics"];
  evaluation: DemoBootstrapPayload["evaluation"];
  selectedMessageId: string | null;
  filters: DemoListFilters;
  detailTab: DemoDetailTab;
  toasts: DemoToastRecord[];
  loading: boolean;
  error: string | null;
  notificationStatus: DemoNotificationStatus;
}

const appWindow = window as AppWindow;
const root = document.getElementById("app-root");
const bootstrapScript = document.getElementById("bootstrap-data");
const toastTimers = new Map<string, number>();

function readBootstrap(): DemoBootstrapPayload {
  if (appWindow.__LEADBRIDGE_BOOTSTRAP__) {
    return appWindow.__LEADBRIDGE_BOOTSTRAP__;
  }
  if (!bootstrapScript?.textContent) {
    throw new Error("Missing demo bootstrap payload");
  }
  return JSON.parse(bootstrapScript.textContent) as DemoBootstrapPayload;
}

const bootstrap = readBootstrap();

const state: AppState = {
  messages: bootstrap.messages,
  metrics: bootstrap.metrics,
  evaluation: bootstrap.evaluation,
  selectedMessageId: bootstrap.selected_message_id ?? bootstrap.messages[0]?.id ?? null,
  filters: { channel: "all", status: "open", search: "" },
  detailTab: "overview",
  toasts: [],
  loading: false,
  error: null,
  notificationStatus: getNotificationStatus(),
};

function getSelectedMessage(): DemoMessageRecord | null {
  return state.messages.find((message) => message.id === state.selectedMessageId) ?? state.messages[0] ?? null;
}

function keepVisibleSelection(): void {
  const visible = filterMessages(state.messages, state.filters);
  if (visible.some((entry) => entry.id === state.selectedMessageId)) {
    return;
  }
  state.selectedMessageId = visible[0]?.id ?? state.selectedMessageId;
}

function setDetailTab(tab: DemoDetailTab): void {
  state.detailTab = tab;
  render();
}

function syncSelection(messageId: string): void {
  state.selectedMessageId = messageId;
  render();
}

function syncFilterChannel(channel: DemoListFilters["channel"]): void {
  state.filters = { ...state.filters, channel };
  keepVisibleSelection();
  render();
}

function syncFilterStatus(status: DemoListFilters["status"]): void {
  state.filters = { ...state.filters, status };
  keepVisibleSelection();
  render();
}

function syncSearch(search: string): void {
  state.filters = { ...state.filters, search };
  keepVisibleSelection();
  render();
}

function updateMessage(message: DemoMessageRecord): void {
  state.messages = state.messages.map((entry) => (entry.id === message.id ? message : entry));
  state.selectedMessageId = message.id;
}

function updateMetrics(metrics: DemoBootstrapPayload["metrics"]): void {
  state.metrics = metrics;
}

function restoreSearchFocus(previousSelection: { start: number | null; end: number | null } | null): void {
  const search = document.getElementById("demo-search") as HTMLInputElement | null;
  if (!search) {
    return;
  }
  if (document.activeElement?.id !== "demo-search") {
    return;
  }
  search.focus();
  if (previousSelection && previousSelection.start !== null && previousSelection.end !== null) {
    try {
      search.setSelectionRange(previousSelection.start, previousSelection.end);
    } catch {
      void 0;
    }
  }
}

function render(): void {
  if (!root) {
    return;
  }
  const activeElement = document.activeElement as HTMLInputElement | null;
  const searchSelection =
    activeElement?.id === "demo-search"
      ? { start: activeElement.selectionStart ?? null, end: activeElement.selectionEnd ?? null }
      : null;

  root.innerHTML = renderDashboardBody({
    messages: state.messages,
    selected_message: getSelectedMessage(),
    filters: state.filters,
    metrics: state.metrics,
    evaluation: state.evaluation,
    loading: state.loading,
    error: state.error,
    detail_tab: state.detailTab,
    toasts: state.toasts,
    notification_status: state.notificationStatus,
  });

  const search = document.getElementById("demo-search") as HTMLInputElement | null;
  if (search) {
    search.value = state.filters.search;
  }
  restoreSearchFocus(searchSelection);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const payload = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

function dismissToast(toastId: string): void {
  const timer = toastTimers.get(toastId);
  if (timer) {
    window.clearTimeout(timer);
    toastTimers.delete(toastId);
  }
  state.toasts = state.toasts.filter((toast) => toast.id !== toastId);
  render();
}

function pushToast(message: DemoMessageRecord): void {
  const toast = createToastFromMessage(message);
  state.toasts = [toast, ...state.toasts].slice(0, 3);
  const existingTimer = toastTimers.get(toast.id);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }
  toastTimers.set(
    toast.id,
    window.setTimeout(() => {
      dismissToast(toast.id);
    }, 6500),
  );
  render();
}

function showFallbackForNotification(): void {
  state.notificationStatus = state.notificationStatus.supported
    ? {
        ...state.notificationStatus,
        explanation: "Browser alerts are unavailable or denied; in-app alerts remain active.",
      }
    : {
        ...state.notificationStatus,
        explanation: "Browser alerts unavailable here; in-app alerts will keep working.",
      };
}

async function mutateMessage(
  messageId: string,
  action: "process" | "approve" | "request-revision" | "resolve" | "ignore" | "restore" | "simulate",
  body: Record<string, unknown> = {},
): Promise<void> {
  state.loading = true;
  state.error = null;
  render();
  try {
    const endpoint =
      action === "simulate"
        ? "/api/demo/messages/simulate"
        : `/api/demo/messages/${encodeURIComponent(messageId)}/${action}`;
    const payload = await requestJson<{ message: DemoMessageRecord; metrics: DemoBootstrapPayload["metrics"] }>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
    updateMetrics(payload.metrics);
    if (action === "simulate") {
      state.messages = [...state.messages, payload.message].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
      pushToast(payload.message);
      if (!showSyntheticBrowserNotification(payload.message) && (state.notificationStatus.permission === "denied" || !state.notificationStatus.supported)) {
        showFallbackForNotification();
      }
    } else {
      updateMessage(payload.message);
    }
    render();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to update message";
  } finally {
    state.loading = false;
    render();
  }
}

async function enableBrowserAlerts(): Promise<void> {
  if (state.notificationStatus.permission === "granted") {
    state.notificationStatus = {
      ...state.notificationStatus,
      explanation: "Browser alerts already enabled for synthetic messages.",
    };
    render();
    return;
  }
  if (typeof Notification === "undefined" || typeof Notification.requestPermission !== "function") {
    state.notificationStatus = {
      permission: "unsupported",
      supported: false,
      explanation: "Browser alerts unavailable here; in-app alerts will keep working.",
    };
    render();
    return;
  }
  state.notificationStatus = {
    ...state.notificationStatus,
    explanation: "Requesting browser alert permission...",
  };
  render();
  state.notificationStatus = await requestBrowserNotificationPermission(() => Notification.requestPermission());
  render();
}

function openAlerts(): void {
  syncFilterStatus("new");
}

function openToastMessage(messageId: string): void {
  state.selectedMessageId = messageId;
  state.filters = { ...state.filters, status: "new" };
  keepVisibleSelection();
  state.detailTab = "overview";
  render();
}

root?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  const actionButton = target?.closest<HTMLElement>("[data-action]");
  if (!actionButton) {
    return;
  }
  const action = actionButton.dataset.action;
  const messageId = actionButton.dataset.messageId;
  const filterValue = actionButton.dataset.filterValue;

  if (action === "select-message" && messageId) {
    syncSelection(messageId);
    return;
  }
  if (action === "set-filter-channel" && filterValue) {
    syncFilterChannel(filterValue as DemoListFilters["channel"]);
    return;
  }
  if (action === "set-filter-status" && filterValue) {
    syncFilterStatus(filterValue as DemoListFilters["status"]);
    return;
  }
  if (action === "set-detail-tab" && filterValue) {
    setDetailTab(filterValue as DemoDetailTab);
    return;
  }
  if (action === "open-alerts") {
    openAlerts();
    return;
  }
  if (action === "enable-browser-alerts") {
    void enableBrowserAlerts();
    return;
  }
  if (action === "simulate-incoming-message") {
    void mutateMessage("synthetic", "simulate");
    return;
  }
  if (action === "dismiss-toast" && messageId) {
    dismissToast(messageId);
    return;
  }
  if (action === "open-toasted-message" && messageId) {
    openToastMessage(messageId);
    return;
  }
  if (!messageId) {
    return;
  }
  if (action === "process-message") {
    void mutateMessage(messageId, "process");
  } else if (action === "approve-message") {
    void mutateMessage(messageId, "approve");
  } else if (action === "request-revision") {
    void mutateMessage(messageId, "request-revision");
  } else if (action === "resolve-message") {
    void mutateMessage(messageId, "resolve");
  } else if (action === "ignore-message") {
    const current = state.messages.find((entry) => entry.id === messageId);
    if (!current) {
      return;
    }
    const reason = window.prompt(
      "Enter an ignore reason:\nspam, unrelated advertisement, bot/noise, duplicate already handled, unrelated content, abusive content requiring no business response, test message, or other with explanation.",
    );
    if (reason && window.confirm(`Ignore ${current.username} in ${current.channel}?\nReason: ${reason.trim()}`)) {
      void mutateMessage(messageId, "ignore", { reason: reason.trim() });
    }
  } else if (action === "restore-message") {
    if (window.confirm("Restore this ignored message to its prior open state?")) {
      void mutateMessage(messageId, "restore");
    }
  }
});

root?.addEventListener("input", (event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.id === "demo-search") {
    syncSearch(target.value);
  }
});

render();
