import {
  ChatIdentity,
  ChatPipelineError,
  NormalizedHistoryMessage,
  RawChatRequest,
  ValidatedChatRequest,
} from "./types";

export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_HISTORY_MESSAGES = 30;
export const MAX_HISTORY_MESSAGE_LENGTH = 4_000;

function normalizeHistory(value: unknown): NormalizedHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY_MESSAGES)
    .map((entry): NormalizedHistoryMessage | null => {
      if (typeof entry === "string") {
        return {
          role: "user",
          content: entry.slice(0, MAX_HISTORY_MESSAGE_LENGTH),
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const rawContent = item.content ?? item.text ?? item.message;
      if (typeof rawContent !== "string" || !rawContent.trim()) return null;
      return {
        role: item.role === "assistant" ? "assistant" : "user",
        content: rawContent.trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH),
      };
    })
    .filter((entry): entry is NormalizedHistoryMessage => entry !== null);
}

export function validateChatRequest(
  raw: RawChatRequest,
  identity: ChatIdentity,
): ValidatedChatRequest {
  if (!raw || typeof raw !== "object") {
    throw new ChatPipelineError("Invalid request payload", 400, "invalid_json");
  }
  if (typeof raw.message !== "string" || !raw.message.trim()) {
    throw new ChatPipelineError("Message is required", 400, "message_required");
  }
  const message = raw.message.trim();
  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new ChatPipelineError(
      "Message is too long",
      400,
      "message_too_long",
    );
  }

  const bodyUid =
    typeof raw.userId === "string" && raw.userId.trim()
      ? raw.userId.trim()
      : undefined;
  const userId = identity.mode === "verified" ? identity.uid : bodyUid;
  if (identity.mode === "development" && !userId) {
    throw new ChatPipelineError(
      "Development requests require a userId",
      401,
      "identity_required",
    );
  }

  return {
    message,
    userId,
    conversationHistory: normalizeHistory(raw.conversationHistory),
    cycleData:
      raw.cycleData && typeof raw.cycleData === "object"
        ? (raw.cycleData as ValidatedChatRequest["cycleData"])
        : undefined,
    userProfile:
      raw.userProfile && typeof raw.userProfile === "object"
        ? (raw.userProfile as ValidatedChatRequest["userProfile"])
        : undefined,
    conversationId:
      typeof raw.conversationId === "string"
        ? raw.conversationId.slice(0, 256)
        : undefined,
    userLanguage:
      typeof raw.userLanguage === "string"
        ? raw.userLanguage.slice(0, 32)
        : undefined,
  };
}

