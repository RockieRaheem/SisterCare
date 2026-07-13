"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Header from "@/components/layout/Header";
import {
  addMessage,
  getMessages,
  getUserConversations,
  createNewChat,
  deleteConversation,
  updateConversationTitle,
  updateConversationPreview,
  getUserProfile,
} from "@/lib/firestore";
import { AgentActionStatus, ChatConversation, UserProfile } from "@/types";
import {
  speechToText,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";

interface Message {
  id: string;
  sender: "user" | "sister";
  text: string;
  timestamp: Date;
  language?: string;
  audio?: {
    url: string;
    durationSeconds: number;
  };
  // Client-only presentation hint - true for a reply that just arrived so it
  // plays a one-time reveal animation. Never set for history loaded from
  // Firestore, so re-opening a chat never replays the effect.
  animate?: boolean;
}

interface ChatApiResponse {
  response: string;
  actionStatuses?: AgentActionStatus[];
  language?: string;
  languageName?: string;
  audio?: {
    url: string;
    durationSeconds: number;
    mimeType: string;
  };
  translationApplied?: boolean;
  counsellorProfile?: {
    id: string;
    name: string;
    title: string;
    languages: string[];
    specializations: string[];
    status: string;
    rating: number;
    reviewCount: number;
    photoURL: string;
    phoneNumber: string;
    whatsappNumber: string;
    profileUrl: string;
  };
}

const CHAT_LANGUAGE_OPTIONS: SupportedLanguageCode[] = ["eng", "lug"];
// Mirrors the server-side limit in src/app/api/chat/route.ts so the
// composer can guard before a doomed request round-trips.
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Reveals text progressively the first time it mounts (a freshly-arrived
 * reply), then stays static forever after. History loaded from Firestore
 * renders instantly via `animate=false`. Purely a presentation effect -
 * `message.text` (the real value used for copy/persistence) never changes.
 */
function StreamedText({
  text,
  animate,
  onTick,
}: {
  text: string;
  animate?: boolean;
  onTick?: () => void;
}) {
  const [visibleLength, setVisibleLength] = useState(
    animate ? 0 : text.length,
  );

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;
    let i = 0;
    const step = () => {
      if (cancelled) return;
      // Reveal a few characters per frame-ish tick - fast enough to feel
      // instant for short replies, visible as a stream for longer ones.
      i = Math.min(text.length, i + Math.max(2, Math.round(text.length / 90)));
      setVisibleLength(i);
      onTick?.();
      if (i < text.length) {
        window.setTimeout(step, 16);
      }
    };
    step();
    return () => {
      cancelled = true;
    };
    // Only run once per mounted message - `text` and `animate` are fixed
    // for the lifetime of a given message id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{text.slice(0, visibleLength)}</>;
}

const isLikelyUiMarkup = (text: string) =>
  /<div class="jsx-[^"]+"/.test(text) &&
  text.includes("material-symbols-outlined");

const isLikelyDummyConversation = (conversation: ChatConversation) => {
  const title = (conversation.title || "").toLowerCase().trim();
  const lastMessage = (conversation.lastMessage || "").trim();
  const hasNoContent = !lastMessage && (conversation.messageCount || 0) === 0;

  // Remove old seeded/demo chats and markup-corrupted conversations from sidebar.
  const looksSeededByTitle =
    title.includes("dummy") ||
    title.includes("sample") ||
    title.includes("demo") ||
    title.includes("default") ||
    title === "chat 1" ||
    title === "chat 2";

  return isLikelyUiMarkup(lastMessage) || looksSeededByTitle || hasNoContent;
};

function isPermissionDeniedError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = (e.code || "").toLowerCase();
  const message = (e.message || "").toLowerCase();
  return (
    code.includes("permission-denied") ||
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions") ||
    message.includes("permission")
  );
}

const icebreakers = [
  {
    icon: "healing",
    text: "How can I manage cramps naturally?",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: "mood",
    text: "I'm feeling a bit anxious today",
    color: "from-purple-500 to-indigo-500",
  },
  {
    icon: "bedtime",
    text: "Tips for better sleep during my period",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: "cycle",
    text: "What phase of my cycle am I in?",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [agentActionStatuses, setAgentActionStatuses] = useState<
    AgentActionStatus[]
  >([]);
  const [counsellorProfile, setCounsellorProfile] = useState<
    ChatApiResponse["counsellorProfile"] | null
  >(null);
  const [userLanguage, setUserLanguage] =
    useState<SupportedLanguageCode>("eng");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [freshChatId, setFreshChatId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<
    Record<string, HTMLAudioElement>
  >({});
  // UI-only additions below — presentation state, no data/agent logic involved.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Pin is a client-only convenience (localStorage per user) - no Firestore
  // schema change needed since it never has to sync across devices to be
  // useful, and keeps this a pure presentation feature.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isFreshChat =
    activeConversationId !== null && activeConversationId === freshChatId;
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const createFreshConversation = useCallback(async (): Promise<
    string | null
  > => {
    if (!user) return null;

    try {
      const newChatId = await createNewChat(user.uid, "New Chat");
      const newConversation: ChatConversation = {
        id: newChatId,
        userId: user.uid,
        title: "New Chat",
        type: "ai_support",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: "",
        messageCount: 0,
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newChatId);
      setMessages([]);
      setFreshChatId(newChatId);
      return newChatId;
    } catch (err) {
      if (isPermissionDeniedError(err)) {
        const localChatId = `local-${Date.now()}`;
        const newConversation: ChatConversation = {
          id: localChatId,
          userId: user.uid,
          title: "New Chat",
          type: "ai_support",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: "",
          messageCount: 0,
        };
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversationId(localChatId);
        setMessages([]);
        setFreshChatId(localChatId);
        return localChatId;
      }

      throw err;
    }
  }, [user]);

  // Check for recording support
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      ) {
        setSpeechSupported(true);
      }
    }
  }, []);

  useEffect(() => {
    if (userProfile?.preferences?.language) {
      const preferred = userProfile.preferences.language.toLowerCase();
      if (preferred in SUPPORTED_LANGUAGES) {
        setUserLanguage(preferred as SupportedLanguageCode);
      }
    }
  }, [userProfile]);

  // Toggle voice input
  const toggleVoiceInput = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice input not supported on this device");
      return;
    }

    if (isListening) {
      // Stop recording
      if (recordingRef.current && recordingRef.current.state !== "inactive") {
        recordingRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start recording
      setInputValue("");
      startVoiceRecording();
    }
  }, [isListening, setError]);

  const startVoiceRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      setIsListening(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      recordingRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Send to Sunbird STT
        setError(null);
        try {
          const result = await speechToText(audioBlob, userLanguage);
          setInputValue(result.transcript);
        } catch (sttError) {
          console.error("STT error:", sttError);
          setError(
            "Speech-to-text conversion failed. Please try again or type your message.",
          );
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("Recording error:", event.error);
        setError("Recording failed. Please try again.");
        setIsListening(false);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Unable to access microphone. Please check permissions.");
      setIsListening(false);
    }
  }, [userLanguage, setError]);
  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
    setShowScrollButton(false);
  }, [messages, scrollToBottom]);

  // Track scroll position so we can surface a "jump to latest" button
  // once the user has scrolled up to read earlier messages.
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  }, []);

  // Power-user shortcut: Cmd/Ctrl+K reveals the sidebar (if needed) and
  // focuses conversation search, matching the convention from Linear/Slack/
  // ChatGPT-style apps.
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSidebarCollapsed(false);
        setSidebarOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // Auto-dismiss transient errors so the thread doesn't stay cluttered -
  // the user can also dismiss manually via the close button.
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const copyMessageText = useCallback((id: string, text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedMessageId(id);
        setTimeout(() => {
          setCopiedMessageId((prev) => (prev === id ? null : prev));
        }, 1800);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`sistercare-pinned-${user.uid}`);
      if (raw) setPinnedIds(new Set(JSON.parse(raw)));
    } catch {
      // Corrupt/old value - ignore and start fresh.
    }
  }, [user]);

  const togglePinned = useCallback(
    (conversationId: string) => {
      if (!user) return;
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(conversationId)) next.delete(conversationId);
        else next.add(conversationId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            `sistercare-pinned-${user.uid}`,
            JSON.stringify(Array.from(next)),
          );
        }
        return next;
      });
    },
    [user],
  );

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/auth/login");
    } catch (err) {
      console.error("Error signing out:", err);
      setSigningOut(false);
    }
  }, [signOut, router]);

  useEffect(() => {
    if (freshChatId && activeConversationId !== freshChatId) {
      setFreshChatId(null);
    }
  }, [activeConversationId, freshChatId]);

  useEffect(() => {
    setConversationMenuOpen(null);
    setProfileMenuOpen(false);
  }, [activeConversationId, sidebarOpen]);

  // Persist draft per conversation so users can continue where they left off.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `sistercare-chat-draft-${activeConversationId || "global"}`;
    const existingDraft = window.localStorage.getItem(key) || "";
    setInputValue(existingDraft);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      // Auto-focus the composer on desktop when switching chats - skipped on
      // small screens so we don't pop the virtual keyboard unexpectedly.
      if (window.innerWidth >= 1024) {
        inputRef.current.focus();
      }
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `sistercare-chat-draft-${activeConversationId || "global"}`;
    window.localStorage.setItem(key, inputValue);
  }, [activeConversationId, inputValue]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  };

  // Create new chat
  const handleNewChat = useCallback(async () => {
    if (!user) return;

    setActionLoading("new");
    try {
      await createFreshConversation();
      setError(null);
      setSidebarOpen(false);
      setConversationMenuOpen(null);
    } catch (err: unknown) {
      console.error("Error creating new chat:", err);
      setError("Failed to create new chat. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }, [createFreshConversation, user]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setActionLoading(conversationId);
    try {
      setFreshChatId(null);
      setConversationMenuOpen(null);
      setActiveConversationId(conversationId);
      const conversationMeta = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId,
      );

      // Skip Firestore for local chats
      if (conversationId.startsWith("local-")) {
        setMessages([]);
        setError(null);
        setSidebarOpen(false);
        return;
      }

      const existingMessages = await getMessages(conversationId);

      const cleanedMessages = existingMessages
        .filter((msg) => !isLikelyUiMarkup(msg.content))
        .map((msg) => {
          const sender: Message["sender"] =
            msg.sender === "user" ? "user" : "sister";
          return {
            id: msg.id,
            sender,
            text: msg.content,
            timestamp: msg.timestamp,
          };
        });

      setMessages(cleanedMessages);
      const latestText = cleanedMessages.length
        ? cleanedMessages[cleanedMessages.length - 1].text
        : "";
      if (isLikelyUiMarkup(conversationMeta?.lastMessage || "") || latestText) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, lastMessage: latestText }
              : conversation,
          ),
        );
      }
      if (conversationMeta?.title === "New Chat" && cleanedMessages.length) {
        const newTitle = generateTitleFromMessage(cleanedMessages[0].text);
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, title: newTitle }
              : conversation,
          ),
        );
        if (!conversationId.startsWith("local-")) {
          try {
            await updateConversationTitle(conversationId, newTitle);
          } catch (titleErr) {
            console.warn("Could not update chat title on load:", titleErr);
          }
        }
      }
      setError(null);
      setSidebarOpen(false);
    } catch (err: unknown) {
      const isPermissionError = isPermissionDeniedError(err);

      if (isPermissionError) {
        console.warn("Conversation access denied - using local fallback.");
      } else {
        console.error("Error loading conversation:", err);
      }

      if (isPermissionError) {
        // Fall back to welcome message for permission errors
        setMessages([]);
        setError(null);
      } else {
        setError("Failed to load conversation. Please try again.");
      }
      setSidebarOpen(false);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const openConversationFromSidebar = useCallback(
    async (conversationId: string) => {
      if (!conversationId || actionLoading === conversationId) return;
      await loadConversation(conversationId);
    },
    [actionLoading, loadConversation],
  );

  // Load all conversations for user
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Load user profile for agent context - handle permission errors gracefully
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (profileErr) {
        if (!isPermissionDeniedError(profileErr)) {
          console.warn("Could not load user profile:", profileErr);
        }
        // Continue without profile - chat can still work
      }

      // Try to load conversations - handle permission errors
      let userConversations: ChatConversation[] = [];
      try {
        userConversations = await getUserConversations(user.uid);
        const cleanConversations = userConversations.filter(
          (conversation) => !isLikelyDummyConversation(conversation),
        );
        setConversations(cleanConversations);
        userConversations = cleanConversations;
      } catch (convErr: unknown) {
        const isPermissionError = isPermissionDeniedError(convErr);

        if (!isPermissionError) {
          console.warn("Could not load conversations:", convErr);
        }

        if (isPermissionError) {
          // Permission error - keep UI usable without creating seeded chats
          setConversations([]);
          setActiveConversationId(null);
          setMessages([]);
          setFreshChatId(null);
          setLoading(false);
          return;
        }
      }

      if (userConversations.length > 0) {
        await loadConversation(userConversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
        setFreshChatId(null);
      }
      setError(null);
    } catch (err: unknown) {
      const isPermissionError = isPermissionDeniedError(err);

      if (isPermissionError) {
        console.warn("Conversations access denied - using local fallback.");
      } else {
        console.error("Error loading conversations:", err);
      }

      if (isPermissionError) {
        // Still allow chat to work locally without cloud sync
        setError(null); // Don't show error - just use local chat
      } else {
        setError("Failed to load conversations. Please try again.");
      }
      setActiveConversationId(null);
      setMessages([]);
      setFreshChatId(null);
    } finally {
      setLoading(false);
    }
  }, [user, loadConversation]);

  // Auth and initial load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user && loading) {
      loadConversations();
    }
  }, [user, authLoading, router, loading, loadConversations]);

  // Delete a chat
  const handleDeleteChat = useCallback(
    async (conversationId: string) => {
      setActionLoading(`delete-${conversationId}`);
      try {
        // Only delete from Firestore if not a local chat
        if (!conversationId.startsWith("local-")) {
          try {
            await deleteConversation(conversationId);
          } catch (firestoreErr) {
            console.warn("Could not delete from Firestore:", firestoreErr);
          }
        }

        setConversations((prev) => {
          const remaining = prev.filter((c) => c.id !== conversationId);

          if (conversationId === activeConversationId) {
            if (remaining.length > 0) {
              loadConversation(remaining[0].id);
            } else {
              setActiveConversationId(null);
              setMessages([]);
            }
          }

          if (conversationId === freshChatId) {
            setFreshChatId(null);
          }

          return remaining;
        });

        setDeleteConfirm(null);
        setError(null);
      } catch (err) {
        console.error("Error deleting chat:", err);
        setError("Failed to delete chat. Please try again.");
      } finally {
        setActionLoading(null);
      }
    },
    [activeConversationId, freshChatId, loadConversation],
  );

  // Rename a chat
  const handleRenameChat = useCallback(
    async (conversationId: string) => {
      if (!editTitleValue.trim()) {
        setEditingTitle(null);
        return;
      }

      setActionLoading(`rename-${conversationId}`);
      try {
        // Only update Firestore if not a local chat
        if (!conversationId.startsWith("local-")) {
          try {
            await updateConversationTitle(
              conversationId,
              editTitleValue.trim(),
            );
          } catch (firestoreErr) {
            console.warn("Could not update title in Firestore:", firestoreErr);
          }
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, title: editTitleValue.trim() }
              : c,
          ),
        );
        setEditingTitle(null);
        setEditTitleValue("");
        setError(null);
      } catch (err) {
        console.error("Error renaming chat:", err);
        setError("Failed to rename chat. Please try again.");
      } finally {
        setActionLoading(null);
      }
    },
    [editTitleValue],
  );

  // Generate title from first message
  const generateTitleFromMessage = useCallback((message: string): string => {
    const words = message.split(" ").slice(0, 5);
    let title = words.join(" ");
    if (message.split(" ").length > 5) {
      title += "...";
    }
    return title.substring(0, 30);
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user) return;

      let currentConversationId = activeConversationId;
      if (!currentConversationId) {
        currentConversationId = await createFreshConversation();
        if (!currentConversationId) return;
      }
      setFreshChatId(null);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      // Get current messages before updating state
      const currentMessages = [...messages, userMessage];

      setMessages(currentMessages);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === currentConversationId
            ? {
                ...conversation,
                lastMessage: text.trim().substring(0, 100),
                updatedAt: new Date(),
              }
            : conversation,
        ),
      );
      setInputValue("");
        if (typeof window !== "undefined") {
          const draftKey = `sistercare-chat-draft-${currentConversationId}`;
          window.localStorage.removeItem(draftKey);
        }
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      setIsTyping(true);
      setError(null);

      try {
        // Only save to Firestore if not a local chat
        const isLocalChat = currentConversationId.startsWith("local-");

        if (!isLocalChat) {
          try {
            await addMessage(currentConversationId, {
              conversationId: currentConversationId,
              sender: "user",
              content: text.trim(),
            });

            await updateConversationPreview(currentConversationId, text.trim());

            const currentConversation = conversationsRef.current.find(
              (c) => c.id === currentConversationId,
            );
            if (currentConversation?.title === "New Chat") {
              const newTitle = generateTitleFromMessage(text.trim());
              await updateConversationTitle(currentConversationId, newTitle);
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === currentConversationId
                    ? { ...c, title: newTitle }
                    : c,
                ),
              );
            }
          } catch (firestoreErr) {
            const isPermissionError = isPermissionDeniedError(firestoreErr);

            // Silently handle Firestore errors - chat still works
            if (isPermissionError) {
              console.warn(
                "Cloud sync unavailable - continuing in local mode.",
              );
            } else {
              console.warn("Could not save to Firestore:", firestoreErr);
            }
          }
        } else {
          // For local chats, just update the title locally
          const currentConversation = conversationsRef.current.find(
            (c) => c.id === currentConversationId,
          );
          if (currentConversation?.title === "New Chat") {
            const newTitle = generateTitleFromMessage(text.trim());
            setConversations((prev) =>
              prev.map((c) =>
                c.id === currentConversationId ? { ...c, title: newTitle } : c,
              ),
            );
          }
        }

        // Use currentMessages which includes the new user message
        const conversationHistory = currentMessages.slice(-10).map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

        // Send message to AI Agent with user context
        const makeRequest = async (
          retryCount = 0,
        ): Promise<ChatApiResponse> => {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text.trim(),
              conversationHistory,
              userId: user.uid,
              conversationId: currentConversationId,
              userProfile: userProfile
                ? {
                    displayName: userProfile.displayName,
                    onboardingCompleted: userProfile.onboardingCompleted,
                  }
                : undefined,
              userLanguage: userLanguage,
              cycleData: userProfile?.cycleData
                ? {
                    lastPeriodDate: userProfile.cycleData.lastPeriodDate,
                    cycleLength: userProfile.cycleData.cycleLength,
                    periodLength: userProfile.cycleData.periodLength,
                    nextPeriodDate: userProfile.cycleData.nextPeriodDate,
                    currentPhase: userProfile.cycleData.currentPhase,
                  }
                : undefined,
            }),
          });

          const data = await res.json();

          // Handle rate limiting with auto-retry
          if (res.status === 429 && retryCount < 2) {
            const retryAfter = parseInt(
              res.headers.get("Retry-After") || "30",
              10,
            );

            // Show temporary waiting message
            const waitMessage: Message = {
              id: `wait-${Date.now()}`,
              sender: "sister",
              text: `${data.response || "I'm thinking... please wait a moment!"} ⏳`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, waitMessage]);

            // Wait and retry
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000),
            );

            // Remove the waiting message before retry
            setMessages((prev) => prev.filter((m) => m.id !== waitMessage.id));

            return makeRequest(retryCount + 1);
          }

          if (!res.ok) {
            throw new Error(
              data.response || data.error || "Failed to get response",
            );
          }

          return data;
        };

        const data = await makeRequest();

        setAgentActionStatuses(data.actionStatuses || []);
        setCounsellorProfile(data.counsellorProfile || null);
        if (data.language) {
          setUserLanguage(data.language as SupportedLanguageCode);
        }

        if (
          data.counsellorProfile?.profileUrl &&
          typeof window !== "undefined"
        ) {
          router.push(data.counsellorProfile.profileUrl);
        }

        if (data.response) {
          const sisterMessage: Message = {
            id: `sister-${Date.now()}`,
            sender: "sister",
            text: data.response,
            timestamp: new Date(),
            language: data.language || "eng",
            audio: data.audio
              ? {
                  url: data.audio.url,
                  durationSeconds: data.audio.durationSeconds,
                }
              : undefined,
            animate: true,
          };

          setMessages((prev) => [...prev, sisterMessage]);

          if (!isLocalChat) {
            try {
              await addMessage(currentConversationId, {
                conversationId: currentConversationId,
                sender: "ai",
                content: data.response,
              });

              await updateConversationPreview(
                currentConversationId,
                data.response,
              );
            } catch (firestoreErr) {
              const isPermissionError = isPermissionDeniedError(firestoreErr);

              if (isPermissionError) {
                console.warn(
                  "Cloud sync unavailable - continuing in local mode.",
                );
              } else {
                console.warn(
                  "Could not save AI response to Firestore:",
                  firestoreErr,
                );
              }
            }
          }

          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConversationId
                ? {
                    ...c,
                    lastMessage: data.response.substring(0, 100),
                    updatedAt: new Date(),
                  }
                : c,
            ),
          );
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setAgentActionStatuses([
          {
            key: "agent-error",
            label: "Agent response failed",
            state: "failed",
          },
        ]);

        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          sender: "sister",
          text: "I'm sorry, I'm having a little trouble right now. Please try again in a moment. Remember, I'm here to support you! 💜",
          timestamp: new Date(),
          animate: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      user,
      activeConversationId,
      messages,
      createFreshConversation,
      generateTitleFromMessage,
      userProfile,
      userLanguage,
    ],
  );

  const isOverLimit = inputValue.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverLimit) return;
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isOverLimit) return;
      sendMessage(inputValue);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayDiff = Math.round(
      (startOfToday.getTime() - startOfDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (dayDiff <= 0) return "Today";
    if (dayDiff === 1) return "Yesterday";
    if (dayDiff <= 7) return "Previous 7 Days";
    if (dayDiff <= 30) return "Previous 30 Days";
    return "Older";
  };

  // Filter conversations by search
  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  const matchesSearch = (conv: ChatConversation) =>
    (conv.title || "").toLowerCase().includes(searchQuery.toLowerCase());

  const pinnedConversations = sortedConversations.filter(
    (conv) => pinnedIds.has(conv.id) && matchesSearch(conv),
  );

  const filteredConversations = sortedConversations.filter(
    (conv) => !pinnedIds.has(conv.id) && matchesSearch(conv),
  );

  // Group the remaining (unpinned) conversations by date
  const groupedConversations = filteredConversations.reduce(
    (acc, conv) => {
      const dateKey = formatDate(conv.updatedAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(conv);
      return acc;
    },
    {} as Record<string, ChatConversation[]>,
  );

  const activeConversationTitle =
    activeConversation?.title || "Start a conversation";

  const continueRecentChats = sortedConversations.slice(0, 4);

  // Derives which empty-state hero to show. Same three mutually-exclusive
  // conditions the page already used, just centralized so we render one
  // hero instead of three near-duplicate blocks.
  const emptyStateContent = isFreshChat
    ? {
        key: "fresh",
        eyebrow: "Fresh chat",
        title: "What would you like to talk about today?",
        subtitle:
          "Start a new private conversation, or open a previous one from the sidebar to continue exactly where you stopped.",
        showIcebreakers: true,
      }
    : !activeConversationId
      ? {
          key: "none",
          eyebrow: "No chat selected",
          title: "Pick a conversation or start a new one",
          subtitle:
            "Use the sidebar to open a previous chat or tap New Chat to begin.",
          showIcebreakers: false,
        }
      : {
          key: "empty",
          eyebrow: "No messages yet",
          title: "Start the conversation",
          subtitle: "Say hello or ask a question to continue this chat.",
          showIcebreakers: false,
        };

  // Shared row renderer for both the Pinned section and the date-grouped
  // list below it, so the two never visually drift apart.
  const renderConversationRow = (conversation: ChatConversation) => {
    const isActive = activeConversationId === conversation.id;
    const isPinned = pinnedIds.has(conversation.id);
    const isBusy = actionLoading === conversation.id;

    if (editingTitle === conversation.id) {
      return (
        <div className="px-2 py-1">
          <input
            type="text"
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={() => handleRenameChat(conversation.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameChat(conversation.id);
              if (e.key === "Escape") setEditingTitle(null);
            }}
            className="w-full rounded-lg border-2 border-primary bg-white px-3 py-2 text-sm text-text-primary focus:outline-none dark:bg-gray-800 dark:text-white"
            autoFocus
          />
        </div>
      );
    }

    if (deleteConfirm === conversation.id) {
      return (
        <div className="mx-1 space-y-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            Delete this chat? This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDeleteChat(conversation.id)}
              disabled={actionLoading === `delete-${conversation.id}`}
              className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {actionLoading === `delete-${conversation.id}` ? (
                <div className="mx-auto h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Delete"
              )}
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => !isBusy && openConversationFromSidebar(conversation.id)}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-l-[3px] py-2 pr-2 text-left transition-colors ${
          isBusy ? "cursor-wait opacity-50" : ""
        } ${
          isActive
            ? "border-l-primary bg-primary/[0.08] pl-[9px] dark:bg-primary/[0.12]"
            : "border-l-transparent pl-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-medium ${
              isActive
                ? "text-primary dark:text-white"
                : "text-text-primary dark:text-gray-200"
            }`}
          >
            {isBusy ? "Loading..." : conversation.title || "Untitled"}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-secondary/80 dark:text-gray-500">
            {conversation.lastMessage || "No messages yet"}
          </p>
        </div>

        {/* Actions - hover-reveal on desktop, always visible on touch */}
        <div className="relative flex shrink-0 items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinned(conversation.id);
            }}
            className={`rounded-md p-1.5 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10 ${
              isPinned ? "text-primary" : "text-text-secondary dark:text-gray-400"
            }`}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              push_pin
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConversationMenuOpen((prev) =>
                prev === conversation.id ? null : conversation.id,
              );
            }}
            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-black/[0.06] dark:text-gray-400 dark:hover:bg-white/10"
            title="More options"
          >
            <span className="material-symbols-outlined text-sm">
              more_horiz
            </span>
          </button>

          {conversationMenuOpen === conversation.id && (
            <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-lg dark:border-white/10 dark:bg-gray-800">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinned(conversation.id);
                  setConversationMenuOpen(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-sm">
                  push_pin
                </span>
                {isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTitleValue(conversation.title || "");
                  setEditingTitle(conversation.id);
                  setConversationMenuOpen(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-sm">
                  edit
                </span>
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(conversation.id);
                  setConversationMenuOpen(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white safe-top safe-bottom dark:bg-[#140c1b]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-[#140c1b]">
      {/* Main Header - Same as other pages */}
      <Header variant="app" />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay for Mobile */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar - Desktop always visible (collapsible), Mobile slide-in */}
        <aside
          className={`
            fixed z-50 flex h-[calc(100vh-65px)] flex-col
            border-r border-black/[0.07] bg-[#faf9fb]
            transition-all duration-200 ease-out dark:border-white/[0.08] dark:bg-[#180f20]
            lg:relative
            ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-black/20" : "-translate-x-full lg:translate-x-0"}
            ${sidebarCollapsed ? "lg:w-[4.25rem]" : "lg:w-[17.5rem]"}
            w-[86vw] xs:w-80 sm:w-[22rem]
          `}
        >
          <div className="flex h-full flex-col">
            {/* Sidebar Header */}
            <div
              className={`flex items-center gap-2 p-3 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "justify-between"}`}
            >
              <Link
                href="/dashboard"
                className={`flex min-w-0 items-center gap-2.5 ${sidebarCollapsed ? "lg:hidden" : ""}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <span className="material-symbols-outlined text-[18px] text-white">
                    spa
                  </span>
                </div>
                <span className="truncate text-sm font-semibold text-text-primary dark:text-white">
                  SisterCare
                </span>
              </Link>

              {sidebarCollapsed && (
                <Link
                  href="/dashboard"
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 lg:flex"
                >
                  <span className="material-symbols-outlined text-[18px] text-white">
                    spa
                  </span>
                </Link>
              )}

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="hidden rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:flex"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <span className="material-symbols-outlined text-lg">
                    {sidebarCollapsed ? "dock_to_right" : "dock_to_left"}
                  </span>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="touch-target rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:hidden"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-3 pb-2">
              <button
                onClick={handleNewChat}
                disabled={actionLoading === "new"}
                title="New chat"
                className={`touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white py-2.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.07] ${sidebarCollapsed ? "lg:px-0" : "px-3"}`}
              >
                {actionLoading === "new" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg text-primary">
                      add
                    </span>
                    <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                      New chat
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Search Conversations */}
            <div
              className={`px-3 pb-3 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-text-secondary dark:text-gray-500">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats"
                  className="w-full rounded-lg border border-transparent bg-black/[0.04] py-2 pl-8 pr-11 text-[13px] text-text-primary placeholder:text-text-secondary/70 transition-colors focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 dark:bg-white/[0.05] dark:text-white dark:focus:bg-white/[0.08]"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-black/10 px-1.5 py-0.5 text-[9px] font-medium text-text-secondary/70 dark:border-white/10 dark:text-gray-500 sm:inline-block">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Conversations List */}
            <div
              className={`custom-scrollbar flex-1 overflow-y-auto px-2 pb-2 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              {pinnedConversations.length === 0 &&
              Object.keys(groupedConversations).length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]">
                    <span className="material-symbols-outlined text-2xl text-text-secondary dark:text-gray-400">
                      forum
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {searchQuery ? "No matching chats" : "No conversations yet"}
                  </p>
                  {!searchQuery && (
                    <p className="mt-1 text-xs text-text-secondary/60 dark:text-gray-500">
                      Start a new chat to begin
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {pinnedConversations.length > 0 && (
                    <div className="mb-3">
                      <p className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary/70 dark:text-gray-500">
                        <span className="material-symbols-outlined text-xs">
                          push_pin
                        </span>
                        Pinned
                      </p>
                      <div className="space-y-0.5">
                        {pinnedConversations.map((conversation) => (
                          <div key={conversation.id} className="group relative">
                            {renderConversationRow(conversation)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.entries(groupedConversations).map(
                    ([dateGroup, convs]) => (
                      <div key={dateGroup} className="mb-3">
                        <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary/70 dark:text-gray-500">
                          {dateGroup}
                        </p>
                        <div className="space-y-0.5">
                          {convs.map((conversation) => (
                            <div key={conversation.id} className="group relative">
                              {renderConversationRow(conversation)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </>
              )}
            </div>

            {/* Sidebar Footer - Profile menu */}
            <div className="relative border-t border-black/[0.06] p-2 dark:border-white/[0.08]">
              {profileMenuOpen && (
                <div className="absolute bottom-full left-2 right-2 z-20 mb-1.5 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800">
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      settings
                    </span>
                    Settings
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      account_circle
                    </span>
                    Profile
                  </Link>
                  <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      logout
                    </span>
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${sidebarCollapsed ? "lg:justify-center" : ""}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-[13px] font-semibold text-white">
                  {user?.displayName?.charAt(0) ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div
                  className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}
                >
                  <p className="truncate text-[13px] font-medium text-text-primary dark:text-white">
                    {user?.displayName || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="truncate text-xs text-text-secondary dark:text-gray-500">
                    {user?.email}
                  </p>
                </div>
                <span
                  className={`material-symbols-outlined text-base text-text-secondary dark:text-gray-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}
                >
                  {profileMenuOpen ? "expand_more" : "expand_less"}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Chat Header Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08] sm:px-4">
            <div className="flex min-w-0 items-center gap-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="hidden rounded-lg p-2 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:flex"
                  title="Expand sidebar"
                >
                  <span className="material-symbols-outlined">
                    dock_to_right
                  </span>
                </button>
              )}
              <button
                onClick={handleNewChat}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                title="New chat"
              >
                <span className="material-symbols-outlined">edit_square</span>
              </button>
              <div className="ml-1 flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate text-sm font-medium text-text-primary dark:text-white">
                  {activeConversationTitle}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/library"
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                title="Library"
              >
                <span className="material-symbols-outlined">menu_book</span>
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                title="Dashboard"
              >
                <span className="material-symbols-outlined">dashboard</span>
              </Link>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="h-full overflow-y-auto"
          >
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-8">
              {error && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  <span className="material-symbols-outlined mt-0.5 text-base">
                    error
                  </span>
                  <p className="flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="rounded-md p-0.5 text-red-500 transition-colors hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
                    title="Dismiss"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              )}

              {agentActionStatuses.length > 0 && (
                <div className="animate-fade-in rounded-xl border border-black/[0.07] bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary sm:text-xs">
                    Agent Actions
                  </p>
                  <div className="space-y-1.5">
                    {agentActionStatuses.map((status) => {
                      const icon =
                        status.state === "done"
                          ? "check_circle"
                          : status.state === "failed"
                            ? "error"
                            : "progress_activity";
                      const colorClass =
                        status.state === "done"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : status.state === "failed"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400";

                      return (
                        <div
                          key={status.key}
                          className="flex items-center gap-2.5 text-xs sm:text-sm"
                        >
                          <span
                            className={`material-symbols-outlined text-base ${colorClass}`}
                          >
                            {icon}
                          </span>
                          <span className="text-text-primary dark:text-white">
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {counsellorProfile && (
                <div className="bg-gradient-to-r from-primary to-purple-600 text-white rounded-2xl p-4 sm:p-5 shadow-lg animate-fade-in">
                  <p className="text-xs uppercase tracking-wide font-semibold opacity-80">
                    Matched counsellor
                  </p>
                  <p className="mt-1 text-sm sm:text-base font-medium">
                    {counsellorProfile.name} is a {counsellorProfile.title}.
                    Open their profile to review languages, specialties, and
                    availability first.
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Link
                      href={counsellorProfile.profileUrl}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary font-semibold shadow-sm"
                    >
                      <span className="material-symbols-outlined text-lg">
                        account_circle
                      </span>
                      Open profile
                    </Link>
                    <Link
                      href={`/counsellors?counsellorId=${counsellorProfile.id}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/30 text-white font-semibold"
                    >
                      <span className="material-symbols-outlined text-lg">
                        arrow_forward
                      </span>
                      View counsellor page
                    </Link>
                  </div>
                </div>
              )}

              {messages.length === 0 && !isTyping && (
                <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 py-6 text-center animate-fade-in sm:min-h-[55vh]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-md shadow-primary/20">
                    <span className="material-symbols-outlined text-xl text-white">
                      spa
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-text-secondary dark:text-gray-500">
                    {emptyStateContent.eyebrow}
                  </p>
                  <h3 className="mt-2 max-w-md text-xl font-semibold text-text-primary dark:text-white sm:text-2xl">
                    {emptyStateContent.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-text-secondary dark:text-gray-400">
                    {emptyStateContent.subtitle}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Private, judgment-free, and available in multiple languages
                  </p>

                  {emptyStateContent.showIcebreakers && (
                    <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-2 xs:grid-cols-2">
                      {icebreakers.map((icebreaker) => (
                        <button
                          key={icebreaker.text}
                          onClick={() => sendMessage(icebreaker.text)}
                          className="group touch-target flex items-center gap-2.5 rounded-xl border border-black/[0.07] bg-white p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] sm:gap-3 sm:p-3"
                        >
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${icebreaker.color} flex items-center justify-center shrink-0`}
                          >
                            <span className="material-symbols-outlined text-white text-sm sm:text-base">
                              {icebreaker.icon}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-text-primary dark:text-gray-300 leading-tight">
                            {icebreaker.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!emptyStateContent.showIcebreakers &&
                    continueRecentChats.length > 0 && (
                      <div className="mt-7 flex w-full max-w-xl flex-wrap items-center justify-center gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary/70 dark:text-gray-500">
                          Jump back in
                        </span>
                        {continueRecentChats.map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() =>
                              openConversationFromSidebar(conversation.id)
                            }
                            className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                          >
                            {conversation.title || "Untitled"}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {messages.map((message) => {
                const isSister = message.sender === "sister";

                // Assistant replies read as plain document text (no card) -
                // only the user's own messages get a bubble, which is what
                // actually needs a visual "sent" affordance.
                if (isSister) {
                  return (
                    <div key={message.id} className="group animate-fade-in flex gap-2.5 sm:gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 sm:h-7 sm:w-7">
                        <span className="material-symbols-outlined text-[13px] text-white sm:text-sm">
                          spa
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap dark:text-gray-100 sm:text-[14.5px]">
                          <StreamedText
                            text={message.text}
                            animate={message.animate}
                            onTick={() => {
                              if (!showScrollButton) scrollToBottom();
                            }}
                          />
                        </p>

                        {message.audio && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const audio = audioElements[message.id];
                                if (audio) {
                                  if (playingAudioId === message.id) {
                                    audio.pause();
                                    setPlayingAudioId(null);
                                  } else {
                                    Object.values(audioElements).forEach((a) =>
                                      a.pause(),
                                    );
                                    audio.play();
                                    setPlayingAudioId(message.id);
                                  }
                                }
                              }}
                              className="rounded-lg p-1.5 text-primary transition-colors hover:bg-primary/10"
                              title={
                                playingAudioId === message.id ? "Pause" : "Play"
                              }
                            >
                              <span className="material-symbols-outlined text-base">
                                {playingAudioId === message.id
                                  ? "pause_circle"
                                  : "play_circle"}
                              </span>
                            </button>
                            <audio
                              ref={(el) => {
                                if (el) {
                                  setAudioElements((prev) => ({
                                    ...prev,
                                    [message.id]: el,
                                  }));
                                }
                              }}
                              src={message.audio.url}
                              onEnded={() => setPlayingAudioId(null)}
                              onError={(e) => {
                                console.error("Audio playback error:", e);
                                setPlayingAudioId(null);
                              }}
                            />
                            <span className="text-xs text-text-secondary dark:text-gray-400">
                              {message.audio.durationSeconds.toFixed(0)}s
                            </span>
                          </div>
                        )}

                        {message.language && message.language !== "eng" && (
                          <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary dark:bg-primary/20 dark:text-primary-light">
                            🌍{" "}
                            {SUPPORTED_LANGUAGES[
                              message.language as SupportedLanguageCode
                            ]?.name || message.language}
                          </span>
                        )}

                        <div className="mt-1.5 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <span className="text-[10px] text-text-secondary dark:text-gray-500">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() =>
                              copyMessageText(message.id, message.text)
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-white"
                            title="Copy message"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {copiedMessageId === message.id
                                ? "check"
                                : "content_copy"}
                            </span>
                            {copiedMessageId === message.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // User turn - the one place a bubble is intentional, since it
                // is the clearest "this is what I sent" signal.
                return (
                  <div
                    key={message.id}
                    className="group animate-fade-in flex justify-end"
                  >
                    <div className="flex max-w-[85%] flex-col items-end sm:max-w-[70%]">
                      <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-white sm:px-4 sm:py-2.5">
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap sm:text-[14.5px]">
                          {message.text}
                        </p>
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-text-secondary opacity-100 transition-opacity dark:text-gray-500 sm:opacity-0 sm:group-hover:opacity-100">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="animate-fade-in flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 sm:h-7 sm:w-7">
                    <span className="material-symbols-outlined text-[13px] text-white sm:text-sm">
                      spa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary dark:text-gray-400">
                      Sister is thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-text-primary shadow-md transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-gray-800 dark:text-white"
              title="Scroll to latest"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_downward
              </span>
            </button>
          )}
          </div>

          {/* Input Area - positioned above bottom nav */}
          <div className="border-t border-black/[0.06] bg-white pb-[calc(var(--bottom-nav-height,72px)+env(safe-area-inset-bottom))] dark:border-white/[0.08] dark:bg-[#140c1b] lg:pb-4">
            <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
              {/* Input Box */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-1.5 rounded-2xl border border-black/[0.09] bg-white p-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:shadow-md dark:border-white/10 dark:bg-white/[0.04] sm:gap-2 sm:p-2">
                  {/* Language Selector - compact icon control */}
                  <div className="relative shrink-0">
                    <select
                      value={userLanguage}
                      onChange={(e) =>
                        setUserLanguage(e.target.value as SupportedLanguageCode)
                      }
                      title="Reply language"
                      className="h-9 w-9 cursor-pointer appearance-none rounded-xl bg-transparent text-center text-xs text-text-secondary transition-colors hover:bg-black/[0.04] focus:outline-none focus:ring-1 focus:ring-primary/40 dark:text-gray-400 dark:hover:bg-white/10 sm:h-10 sm:w-10"
                    >
                      {CHAT_LANGUAGE_OPTIONS.map((code) => (
                        <option key={code} value={code}>
                          {SUPPORTED_LANGUAGES[code].name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-text-secondary dark:text-gray-400">
                      language
                    </span>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isListening ? "Listening..." : "Message Sister..."
                    }
                    disabled={isTyping || isListening}
                    rows={1}
                    className="max-h-[120px] flex-1 resize-none border-none bg-transparent px-1 py-2.5 text-[13px] text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-0 dark:text-white sm:max-h-[150px] sm:px-2 sm:text-sm"
                  />
                  {/* Voice Input Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      disabled={isTyping}
                      className={`touch-target shrink-0 rounded-xl p-2.5 transition-colors sm:p-2.5 ${
                        isListening
                          ? "animate-pulse bg-red-500 text-white"
                          : "text-text-secondary hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/10"
                      }`}
                      title={isListening ? "Stop listening" : "Voice input"}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isListening ? "mic_off" : "mic"}
                      </span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping || isOverLimit}
                    className="touch-target shrink-0 rounded-xl bg-primary p-2.5 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-100 dark:disabled:bg-gray-700"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isTyping ? "hourglass_top" : "arrow_upward"}
                    </span>
                  </button>
                </div>
              </form>

              <div className="mt-2 flex items-center justify-between gap-2 px-1 sm:mt-3">
                <p className="text-[9px] text-text-secondary dark:text-gray-500 sm:text-[10px]">
                Sister is an AI companion. For emergencies, call{" "}
                <a
                  href="tel:116"
                  className="text-primary hover:underline font-medium"
                >
                  Sauti 116
                </a>{" "}
                or see a healthcare professional.
                </p>
                <div className="flex items-center gap-3">
                  {inputValue.length > MAX_MESSAGE_LENGTH - 200 && (
                    <span
                      className={`text-[10px] font-medium ${
                        isOverLimit
                          ? "text-red-500"
                          : "text-text-secondary dark:text-gray-500"
                      }`}
                    >
                      {inputValue.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  )}
                  <span className="hidden text-[10px] font-medium text-text-secondary dark:text-gray-500 sm:inline">
                    Enter to send, Shift+Enter for new line
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
