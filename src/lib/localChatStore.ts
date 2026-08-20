import { ChatMessage, ChatConversation } from "@/types";

const CONVERSATIONS_KEY = "sistercare-conversations";
const MESSAGES_PREFIX = "sistercare-messages-";
const DELETED_KEY = "sistercare-deleted-conversations";
const LOCAL_ID_PREFIX = "local-";

function generateId(): string {
  return `${LOCAL_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadJSON(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

function saveJSON(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}

function loadConversations(): Record<string, ChatConversation> {
  const raw: unknown[] = loadJSON(CONVERSATIONS_KEY);
  return raw.reduce<Record<string, ChatConversation>>(
    (acc, entry) => {
      const [id, conv] = entry as [string, Record<string, unknown>];
      acc[id] = {
        ...(conv as unknown as ChatConversation),
        createdAt: new Date(String(conv.createdAt)),
        updatedAt: new Date(String(conv.updatedAt)),
      };
      return acc;
    },
    {},
  );
}

function saveConversationsMap(map: Record<string, ChatConversation>): void {
  const entries = Object.entries(map);
  saveJSON(CONVERSATIONS_KEY, entries);
}

export function loadLocalConversations(userId: string): ChatConversation[] {
  const map = loadConversations();
  const deleted = getDeletedIds();
  return Object.values(map)
    .filter((c) => c.userId === userId && !deleted.has(c.id))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Build the visible history from the durable server index and this device's
 * cache. Server conversations remain visible when localStorage is empty or
 * unavailable, while local deletion tombstones still prevent removed chats
 * from unexpectedly returning after a failed network deletion.
 */
export function mergeConversationHistory(
  userId: string,
  remoteConversations: ChatConversation[],
): ChatConversation[] {
  const deleted = getDeletedIds();
  const merged = new Map<string, ChatConversation>();

  remoteConversations
    .filter((conversation) => conversation.userId === userId && !deleted.has(conversation.id))
    .forEach((conversation) => merged.set(conversation.id, conversation));

  loadLocalConversations(userId).forEach((conversation) => {
    const remote = merged.get(conversation.id);
    merged.set(
      conversation.id,
      remote && remote.updatedAt.getTime() > conversation.updatedAt.getTime()
        ? remote
        : conversation,
    );
  });

  return Array.from(merged.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

export function saveLocalConversation(conv: ChatConversation): void {
  const map = loadConversations();
  map[conv.id] = conv;
  saveConversationsMap(map);
}

/**
 * A new chat starts locally so it feels instant, then receives its Supabase
 * ID when sync succeeds. Move both the conversation and its cached messages
 * to that canonical ID; leaving the temporary record behind created empty
 * chats that looked selectable but had no history.
 */
export function migrateLocalConversationId(
  temporaryId: string,
  canonicalConversation: ChatConversation,
): void {
  const map = loadConversations();
  const temporary = map[temporaryId];
  const canonical = map[canonicalConversation.id];
  map[canonicalConversation.id] = {
    ...(temporary || {}),
    ...(canonical || {}),
    ...canonicalConversation,
    id: canonicalConversation.id,
  } as ChatConversation;
  delete map[temporaryId];
  saveConversationsMap(map);

  if (typeof window === "undefined" || temporaryId === canonicalConversation.id) {
    return;
  }

  try {
    const temporaryMessages = loadLocalMessages(temporaryId);
    const canonicalMessages = loadLocalMessages(canonicalConversation.id);
    const merged = [...canonicalMessages, ...temporaryMessages].filter(
      (message, index, all) =>
        all.findIndex((candidate) => candidate.id === message.id) === index,
    );
    if (merged.length > 0) {
      saveJSON(MESSAGES_PREFIX + canonicalConversation.id, merged);
    }
    window.localStorage.removeItem(MESSAGES_PREFIX + temporaryId);
  } catch {
    // The conversation metadata still points to the durable ID even if local
    // storage is unavailable; Supabase remains the source of truth.
  }
}

export function deleteLocalConversation(conversationId: string): void {
  // Remove from conversations map
  const map = loadConversations();
  delete map[conversationId];
  saveConversationsMap(map);
  // Remove messages
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MESSAGES_PREFIX + conversationId);
    } catch {}
  }
  // Add to tombstones so it never reappears
  addDeletedId(conversationId);
}

export function createLocalConversation(
  userId: string,
  title = "New Chat",
  retentionMode: ChatConversation["retentionMode"] = "account",
): ChatConversation {
  const now = new Date();
  const conv: ChatConversation = {
    id: generateId(),
    userId,
    title,
    type: "ai_support",
    status: "active",
    retentionMode,
    createdAt: now,
    updatedAt: now,
    lastMessage: "",
    messageCount: 0,
  };
  saveLocalConversation(conv);
  return conv;
}

export function updateLocalConversationTitle(
  conversationId: string,
  title: string,
): void {
  const map = loadConversations();
  if (map[conversationId]) {
    map[conversationId].title = title;
    map[conversationId].updatedAt = new Date();
    saveConversationsMap(map);
  }
}

export function touchLocalConversation(
  conversationId: string,
  lastMessage: string,
): void {
  const map = loadConversations();
  if (map[conversationId]) {
    map[conversationId].updatedAt = new Date();
    map[conversationId].lastMessage = lastMessage.substring(0, 100);
    map[conversationId].messageCount = (map[conversationId].messageCount || 0) + 1;
    saveConversationsMap(map);
  }
}

export function loadLocalMessages(conversationId: string): ChatMessage[] {
  const raw: unknown[] = loadJSON(MESSAGES_PREFIX + conversationId);
  return raw.map((item) => {
    const m = item as Record<string, unknown>;
    return {
      id: String(m.id || ""),
      conversationId: String(m.conversationId || ""),
      sender: (m.sender === "user" ? "user" : "ai") as ChatMessage["sender"],
      content: String(m.content || ""),
      timestamp: new Date(String(m.timestamp)),
      read: Boolean(m.read),
      metadata:
        m.metadata && typeof m.metadata === "object"
          ? (m.metadata as ChatMessage["metadata"])
          : undefined,
    };
  });
}

export function saveLocalMessage(
  conversationId: string,
  message: ChatMessage,
): void {
  const messages = loadLocalMessages(conversationId);
  messages.push(message);
  saveJSON(MESSAGES_PREFIX + conversationId, messages);
}

// --- Deleted conversation tombstones ---

function getDeletedIds(): Set<string> {
  return new Set((loadJSON(DELETED_KEY) as string[]));
}

function addDeletedId(id: string): void {
  const set = getDeletedIds();
  set.add(id);
  saveJSON(DELETED_KEY, Array.from(set));
}

// Clean deleted tombstones for conversations that no longer exist in Supabase
export function cleanDeletedTombstones(
  supabaseIds: string[],
): void {
  const supabaseSet = new Set(supabaseIds);
  const kept = Array.from(getDeletedIds()).filter((id) => supabaseSet.has(id));
  saveJSON(DELETED_KEY, kept);
}
