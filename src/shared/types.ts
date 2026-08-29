export type Channel = "facebook" | "instagram" | "tiktok" | "email";

export type MessageRole = "customer" | "agent";

export interface ConversationMessage {
  role: MessageRole;
  text: string;
  timestamp: string;
}

export const GENERIC_BUSINESS_DESCRIPTION =
  "Synthetic East African retail and order-handling context for evaluation only.";
