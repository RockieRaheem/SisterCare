import { NormalizedHistoryMessage } from "./types";

const MAX_AUTHORITATIVE_HISTORY_MESSAGES = 50;

/**
 * Prefer the authenticated conversation transcript when it is available. The
 * browser-provided history is a resilience fallback, not a source of truth.
 */
export function selectConversationMemory(
  storedHistory: NormalizedHistoryMessage[],
  clientHistory: NormalizedHistoryMessage[],
  currentMessage: string,
): NormalizedHistoryMessage[] {
  const source = storedHistory.length > 0 ? storedHistory : clientHistory;
  const history = source.slice(-MAX_AUTHORITATIVE_HISTORY_MESSAGES);
  const last = history.at(-1);

  // The browser persists the just-sent message before calling /api/chat. The
  // executor adds it separately, so remove that duplicate turn.
  if (last?.role === "user" && last.content.trim() === currentMessage.trim()) {
    return history.slice(0, -1);
  }

  return history;
}

export { MAX_AUTHORITATIVE_HISTORY_MESSAGES };
