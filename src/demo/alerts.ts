import type { DemoMessageRecord, DemoNotificationStatus, DemoToastRecord } from "./types.js";

export function createToastFromMessage(message: DemoMessageRecord): DemoToastRecord {
  return {
    id: `toast-${message.id}`,
    message_id: message.id,
    channel: message.channel,
    username: message.username,
    preview: message.preview,
    title: "Synthetic message arrived",
    body: `Channel: ${message.channel}. Preview: ${message.preview}`,
    created_at: new Date().toISOString(),
  };
}

export function createUnsupportedNotificationStatus(): DemoNotificationStatus {
  return {
    permission: "unsupported",
    supported: false,
    explanation: "Browser alerts unavailable here; in-app alerts will keep working.",
  };
}

export function createNotificationStatus(permission: "default" | "granted" | "denied"): DemoNotificationStatus {
  return {
    permission,
    supported: true,
    explanation:
      permission === "granted"
        ? "Browser alerts enabled for synthetic messages."
        : permission === "denied"
          ? "Browser alerts are denied; in-app alerts remain active."
          : "Browser alerts are available after you enable them.",
  };
}

export async function requestBrowserNotificationPermission(
  requestPermission: () => Promise<NotificationPermission>,
): Promise<DemoNotificationStatus> {
  const permission = await requestPermission();
  if (permission === "granted" || permission === "denied" || permission === "default") {
    return createNotificationStatus(permission);
  }
  return createUnsupportedNotificationStatus();
}

export function getNotificationStatus(): DemoNotificationStatus {
  if (typeof Notification === "undefined") {
    return createUnsupportedNotificationStatus();
  }
  return createNotificationStatus(Notification.permission);
}

export function canShowBrowserNotification(status: DemoNotificationStatus): boolean {
  return status.supported && status.permission === "granted";
}

export function showSyntheticBrowserNotification(message: DemoMessageRecord): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return false;
  }
  const notification = new Notification("LeadBridge AI synthetic alert", {
    body: `${message.channel} · ${message.username} · ${message.preview}`,
    tag: message.id,
  });
  void notification;
  return true;
}
