export type ChatMessageRole = "assistant" | "user";
export type ChatMessageContentKey = "previewResponse";
export type ChatMessageContentValues = Record<string, string | number | boolean | null>;
export type ChatMessageTimestampKind = "now" | "preview" | "date";
export type ChatMessageTimestampValues = Record<string, string | number | boolean | null>;

export interface ChatMessageTimestamp {
  createdAt: string;
  kind: ChatMessageTimestampKind;
  values?: ChatMessageTimestampValues;
}

export interface ChatMessage {
  content: string;
  contentKey?: ChatMessageContentKey;
  contentValues?: ChatMessageContentValues;
  id: string;
  role: ChatMessageRole;
  timestamp: ChatMessageTimestamp;
}
