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
const MAX_MESSAGE_LENGTH = 2000;

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
    label: "Cramp relief",
    text: "How can I manage cramps naturally?",
    color: "from-rose-400 to-pink-500",
  },
  {
    icon: "mood",
    label: "Feeling anxious",
    text: "I'm feeling a bit anxious today",
    color: "from-violet-400 to-purple-500",
  },
  {
    icon: "bedtime",
    label: "Sleep tips",
    text: "Tips for better sleep during my period",
    color: "from-sky-400 to-blue-500",
  },
  {
    icon: "cycle",
    label: "My cycle",
    text: "What phase of my cycle am I in?",
    color: "from-emerald-400 to-teal-500",
  },
];

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  }
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  }
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const isCurrentYear = year === now.getFullYear();
  return isCurrentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
}

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [agentActionStatuses, setAgentActionStatuses] = useState<AgentActionStatus[]>([]);
  const [counsellorProfile, setCounsellorProfile] = useState<ChatApiResponse["counsellorProfile"] | null>(null);
  const [userLanguage, setUserLanguage] = useState<SupportedLanguageCode>("eng");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [freshChatId, setFreshChatId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
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

  const createFreshConversation = useCallback(async (): Promise<string | null> => {
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

  const toggleVoiceInput = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice input not supported on this device");
      return;
    }

    if (isListening) {
      if (recordingRef.current && recordingRef.current.state !== "inactive") {
        recordingRef.current.stop();
      }
      setIsListening(false);
    } else {
      setInputValue("");
      startVoiceRecording();
    }
  }, [isListening]);

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

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setError(null);
        try {
          const result = await speechToText(audioBlob, userLanguage);
          setInputValue(result.transcript);
        } catch (sttError) {
          console.error("STT error:", sttError);
          setError("Speech-to-text conversion failed. Please try again or type your message.");
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
  }, [userLanguage]);

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

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  }, []);

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

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuId) setContextMenuId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenuId]);

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
      // ignore
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `sistercare-chat-draft-${activeConversationId || "global"}`;
    const existingDraft = window.localStorage.getItem(key) || "";
    setInputValue(existingDraft);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  };

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

  const loadConversation = useCallback(async (conversationId: string) => {
    setActionLoading(conversationId);
    try {
      setFreshChatId(null);
      setConversationMenuOpen(null);
      setActiveConversationId(conversationId);
      const conversationMeta = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId,
      );

      if (conversationId.startsWith("local-")) {
        setMessages([]);
        setError(null);
        setSidebarOpen(false);
        setContextMenuId(null);
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
      setContextMenuId(null);
    } catch (err: unknown) {
      const isPermissionError = isPermissionDeniedError(err);

      if (isPermissionError) {
        console.warn("Conversation access denied - using local fallback.");
      } else {
        console.error("Error loading conversation:", err);
      }

      if (isPermissionError) {
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

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (profileErr) {
        if (!isPermissionDeniedError(profileErr)) {
          console.warn("Could not load user profile:", profileErr);
        }
      }

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
        setError(null);
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user && loading) {
      loadConversations();
    }
  }, [user, authLoading, router, loading, loadConversations]);

  const handleDeleteChat = useCallback(
    async (conversationId: string) => {
      setActionLoading(`delete-${conversationId}`);
      try {
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

        setDeleteModalId(null);
        setContextMenuId(null);
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

  const handleRenameChat = useCallback(
    async (conversationId: string) => {
      if (!editTitleValue.trim()) {
        setEditingTitle(null);
        return;
      }

      setActionLoading(`rename-${conversationId}`);
      try {
        if (!conversationId.startsWith("local-")) {
          try {
            await updateConversationTitle(conversationId, editTitleValue.trim());
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

  const generateTitleFromMessage = useCallback((message: string): string => {
    const words = message.split(" ").slice(0, 5);
    let title = words.join(" ");
    if (message.split(" ").length > 5) {
      title += "...";
    }
    return title.substring(0, 30);
  }, []);

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

            if (isPermissionError) {
              console.warn("Cloud sync unavailable - continuing in local mode.");
            } else {
              console.warn("Could not save to Firestore:", firestoreErr);
            }
          }
        } else {
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

        const conversationHistory = currentMessages.slice(-10).map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

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

          if (res.status === 429 && retryCount < 2) {
            const retryAfter = parseInt(
              res.headers.get("Retry-After") || "30",
              10,
            );

            const waitMessage: Message = {
              id: `wait-${Date.now()}`,
              sender: "sister",
              text: `${data.response || "I'm thinking... please wait a moment!"} ⏳`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, waitMessage]);

            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000),
            );

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
                console.warn("Cloud sync unavailable - continuing in local mode.");
              } else {
                console.warn("Could not save AI response to Firestore:", firestoreErr);
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

  const formatDateGroup = (date: Date) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round(
      (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (dayDiff <= 0) return "Today";
    if (dayDiff === 1) return "Yesterday";
    if (dayDiff < 7) return "Earlier this week";
    if (dayDiff < 30) return "Earlier this month";
    return "Older";
  };

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

  const groupedConversations = filteredConversations.reduce(
    (acc, conv) => {
      const dateKey = formatDateGroup(conv.updatedAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(conv);
      return acc;
    },
    {} as Record<string, ChatConversation[]>,
  );

  const activeConversationTitle =
    activeConversation?.title || "Start a conversation";

  const continueRecentChats = sortedConversations.slice(0, 4);

  const emptyStateContent = isFreshChat
    ? {
        key: "fresh",
        title: "What's on your mind?",
        subtitle: "Ask me anything — I'm here to listen and help.",
        showIcebreakers: true,
      }
    : !activeConversationId
      ? {
          key: "none",
          title: "Select a conversation",
          subtitle: "Pick a chat from the sidebar or start something new.",
          showIcebreakers: false,
        }
      : {
          key: "empty",
          title: "No messages yet",
          subtitle: "Write your first message to begin.",
          showIcebreakers: false,
        };

  const renderConversationRow = (conversation: ChatConversation) => {
    const isActive = activeConversationId === conversation.id;
    const isPinned = pinnedIds.has(conversation.id);
    const isBusy = actionLoading === conversation.id;

    if (editingTitle === conversation.id) {
      return (
        <div className="px-2 py-1.5">
          <input
            type="text"
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={() => handleRenameChat(conversation.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameChat(conversation.id);
              if (e.key === "Escape") setEditingTitle(null);
            }}
            className="w-full rounded-xl border-2 border-primary/60 bg-white px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none dark:bg-gray-800 dark:text-white"
            autoFocus
          />
        </div>
      );
    }

    return (
      <div
        onClick={() => !isBusy && openConversationFromSidebar(conversation.id)}
        className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
          isBusy ? "cursor-wait opacity-50" : ""
        } ${
          isActive
            ? "bg-primary/[0.08] shadow-sm dark:bg-primary/[0.12]"
            : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
          <span className={`material-symbols-outlined text-sm ${isActive ? "text-primary" : "text-text-secondary dark:text-gray-400"}`}>
            chat
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`truncate text-sm font-medium ${
                isActive
                  ? "text-primary dark:text-white"
                  : "text-text-primary dark:text-gray-200"
              }`}
            >
              {isBusy ? "Loading..." : conversation.title || "Untitled"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="truncate text-xs text-text-secondary/60 dark:text-gray-500">
              {conversation.lastMessage || "No messages yet"}
            </p>
            {conversation.lastMessage && (
              <span className="shrink-0 text-[10px] font-medium text-text-secondary/40 dark:text-gray-600">
                {formatRelativeTime(conversation.updatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenuId((prev) =>
                prev === conversation.id ? null : conversation.id,
              );
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.06] dark:text-gray-400 dark:hover:bg-white/10"
            title="More options"
          >
            <span className="material-symbols-outlined text-sm">more_horiz</span>
          </button>

          {contextMenuId === conversation.id && (
            <div
              className="absolute right-2 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  togglePinned(conversation.id);
                  setContextMenuId(null);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-text-primary transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-sm">
                  {isPinned ? "push_pin" : "push_pin"}
                </span>
                {isPinned ? "Unpin" : "Pin to top"}
              </button>
              <button
                onClick={() => {
                  setEditTitleValue(conversation.title || "");
                  setEditingTitle(conversation.id);
                  setContextMenuId(null);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-text-primary transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Rename
              </button>
              <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />
              <button
                onClick={() => {
                  setDeleteModalId(conversation.id);
                  setContextMenuId(null);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete conversation
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compute date separators for messages
  const messagesWithSeparators: Array<
    { type: "separator"; date: Date; label: string } |
    { type: "message"; message: Message }
  > = [];
  let lastDateKey = "";
  messages.forEach((message) => {
    const dateKey = `${message.timestamp.getFullYear()}-${message.timestamp.getMonth()}-${message.timestamp.getDate()}`;
    if (dateKey !== lastDateKey) {
      messagesWithSeparators.push({
        type: "separator",
        date: message.timestamp,
        label: formatDateSeparator(message.timestamp),
      });
      lastDateKey = dateKey;
    }
    messagesWithSeparators.push({ type: "message", message });
  });

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f6] safe-top safe-bottom dark:bg-[#140e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
          <p className="text-sm font-medium text-text-secondary/70 dark:text-gray-400">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#faf8f6] dark:bg-[#140e1a]">
      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteModalId(null)}
        >
          <div
            className="mx-4 w-full max-w-sm animate-fade-in rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <span className="material-symbols-outlined text-2xl text-red-500 dark:text-red-400">
                delete_forever
              </span>
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold text-text-primary dark:text-white">
              Delete this conversation?
            </h3>
            <p className="mb-6 text-center text-sm leading-relaxed text-text-secondary dark:text-gray-400">
              This will permanently remove this chat and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteChat(deleteModalId)}
                disabled={actionLoading === `delete-${deleteModalId}`}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading === `delete-${deleteModalId}` ? (
                  <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.05] bg-white/90 px-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#140e1a]/90">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:hidden"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
              <span className="material-symbols-outlined text-[18px] text-white">spa</span>
            </div>
            <span className="hidden text-sm font-semibold text-text-primary dark:text-white sm:inline">
              SisterCare
            </span>
          </Link>
          <div className="ml-2 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {activeConversationTitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/library"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
            title="Health Library"
          >
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
            title="Dashboard"
          >
            <span className="material-symbols-outlined text-xl">dashboard</span>
          </Link>
          <div className="ml-1 flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-xs font-semibold text-white">
              {user?.displayName?.charAt(0) ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay */}
        <div
          className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside
          className={`
            fixed z-40 flex h-[calc(100vh-3.5rem)] flex-col
            border-r border-black/[0.05] bg-white
            shadow-xl shadow-black/5
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            dark:border-white/[0.06] dark:bg-[#191123]
            lg:relative lg:shadow-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarCollapsed ? "lg:w-[4.5rem]" : "lg:w-[20rem]"}
            w-[20rem]
          `}
        >
          <div className="flex h-full flex-col">
            {/* Sidebar Header */}
            <div className={`flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.06] ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "justify-between"}`}>
              <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <span className="material-symbols-outlined text-[18px] text-white">spa</span>
                </div>
                <span className="text-sm font-semibold text-text-primary dark:text-white">
                  Conversations
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:flex"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <span className="material-symbols-outlined text-lg">
                    {sidebarCollapsed ? "panel_open" : "panel_close"}
                  </span>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:hidden"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* New Chat + Search */}
            <div className="space-y-2.5 px-3 pb-2 pt-3">
              <button
                onClick={handleNewChat}
                disabled={actionLoading === "new"}
                className={`touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25 ${sidebarCollapsed ? "lg:px-0" : "px-3"}`}
              >
                {actionLoading === "new" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                      New conversation
                    </span>
                  </>
                )}
              </button>
              <div className={`${sidebarCollapsed ? "lg:hidden" : ""}`}>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary/60 dark:text-gray-500">
                    search
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full rounded-xl border border-transparent bg-black/[0.04] py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/50 transition-colors focus:border-primary/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 dark:bg-white/[0.05] dark:text-white dark:focus:bg-white/[0.07]"
                  />
                </div>
              </div>
            </div>

            {/* Conversations List */}
            <div
              className={`custom-scrollbar flex-1 overflow-y-auto px-2 py-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              {pinnedConversations.length === 0 &&
              Object.keys(groupedConversations).length === 0 ? (
                <div className="flex flex-col items-center px-4 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.03] dark:bg-white/[0.05]">
                    <span className="material-symbols-outlined text-2xl text-text-secondary/50 dark:text-gray-400">
                      forum
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
                    {searchQuery ? "No matching chats" : "No conversations yet"}
                  </p>
                  {!searchQuery && (
                    <p className="mt-1 text-xs text-text-secondary/50 dark:text-gray-500">
                      Start a new conversation above
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {pinnedConversations.length > 0 && (
                    <div className="mb-3">
                      <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-gray-500">
                        <span className="material-symbols-outlined text-xs">push_pin</span>
                        Pinned
                      </p>
                      <div className="space-y-0.5">
                        {pinnedConversations.map((conversation) => (
                          <div key={conversation.id}>
                            {renderConversationRow(conversation)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.entries(groupedConversations).map(
                    ([dateGroup, convs]) => (
                      <div key={dateGroup} className="mb-3">
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-gray-500">
                          {dateGroup}
                        </p>
                        <div className="space-y-0.5">
                          {convs.map((conversation) => (
                            <div key={conversation.id}>
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

            {/* Bottom profile */}
            <div className="border-t border-black/[0.04] p-2 dark:border-white/[0.06]">
              {profileMenuOpen && (
                <div className="absolute bottom-full left-2 right-2 z-20 mb-1.5 overflow-hidden rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800">
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-text-primary transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">settings</span>
                    Settings
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-text-primary transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">account_circle</span>
                    Profile
                  </Link>
                  <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-xs font-semibold text-white">
                  {user?.displayName?.charAt(0) ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary dark:text-white">
                    {user?.displayName || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="truncate text-[10px] text-text-secondary/60 dark:text-gray-500">
                    {user?.email}
                  </p>
                </div>
                <span className="material-symbols-outlined text-sm text-text-secondary/60 dark:text-gray-500">
                  {profileMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Subtle chat header bar */}
          <div className="flex items-center justify-between border-b border-black/[0.04] bg-white/50 px-3 py-2 backdrop-blur-sm dark:border-white/[0.05] dark:bg-[#140e1a]/50">
            <div className="flex min-w-0 items-center gap-1">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06] lg:flex"
                >
                  <span className="material-symbols-outlined">dock_to_right</span>
                </button>
              )}
              {activeConversation && (
                <div className="flex items-center gap-2 text-xs text-text-secondary/60 dark:text-gray-500">
                  <span>{activeConversation.messageCount || 0} messages</span>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span>
                    {activeConversation.type === "counsellor" ? "Counsellor" : "AI Support"}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleNewChat}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-text-secondary transition-colors hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.06]"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="h-full overflow-y-auto"
            >
              <div className="mx-auto max-w-3xl px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                {error && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur-sm dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
                    <span className="material-symbols-outlined mt-0.5 text-base">error</span>
                    <p className="flex-1">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="rounded-lg p-0.5 text-red-500 transition-colors hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                )}

                {agentActionStatuses.length > 0 && (
                  <div className="mb-4 animate-fade-in rounded-2xl border border-black/[0.05] bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
                      Agent actions
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
                              ? "text-red-500 dark:text-red-400"
                              : "text-amber-500 dark:text-amber-400";

                        return (
                          <div key={status.key} className="flex items-center gap-2.5 text-xs">
                            <span className={`material-symbols-outlined text-sm ${colorClass}`}>
                              {icon}
                            </span>
                            <span className="text-text-primary dark:text-white">{status.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {counsellorProfile && (
                  <div className="mb-4 animate-fade-in rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-indigo-700 p-5 text-white shadow-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                      Counsellor matched
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed">
                      {counsellorProfile.name} is a {counsellorProfile.title}. Review their profile before connecting.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link
                        href={counsellorProfile.profileUrl}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-gray-50"
                      >
                        <span className="material-symbols-outlined text-lg">account_circle</span>
                        Open profile
                      </Link>
                      <Link
                        href={`/counsellors?counsellorId=${counsellorProfile.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        View counsellor page
                      </Link>
                    </div>
                  </div>
                )}

                {/* Empty States */}
                {messages.length === 0 && !isTyping && (
                  <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center animate-fade-in">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 dark:from-primary/30 dark:to-purple-600/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-2xl text-white">spa</span>
                      </div>
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary dark:text-white sm:text-2xl">
                      {emptyStateContent.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-text-secondary/70 dark:text-gray-400">
                      {emptyStateContent.subtitle}
                    </p>

                    {emptyStateContent.showIcebreakers && (
                      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2.5 xs:grid-cols-2">
                        {icebreakers.map((icebreaker) => (
                          <button
                            key={icebreaker.text}
                            onClick={() => sendMessage(icebreaker.text)}
                            className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3.5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${icebreaker.color} shadow-sm`}
                            >
                              <span className="material-symbols-outlined text-lg text-white">
                                {icebreaker.icon}
                              </span>
                            </div>
                            <span className="text-sm font-medium leading-snug text-text-primary dark:text-gray-200">
                              {icebreaker.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!emptyStateContent.showIcebreakers && activeConversationId && (
                      <div className="mt-6 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary-light">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Type a message below to begin
                      </div>
                    )}

                    {!emptyStateContent.showIcebreakers && !activeConversationId && continueRecentChats.length > 0 && (
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-gray-500">
                          Jump back in
                        </span>
                        {continueRecentChats.map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() => openConversationFromSidebar(conversation.id)}
                            className="rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-medium text-text-primary transition-all hover:border-primary/40 hover:bg-primary/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                          >
                            {conversation.title || "Untitled"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages with date separators */}
                {messages.length > 0 && (
                  <div className="space-y-6">
                    {(messagesWithSeparators as Array<{ type: string; message?: Message; date?: Date; label?: string }>).map((item, idx) => {
                      if (item.type === "separator") {
                        return (
                          <div key={`sep-${idx}`} className="flex items-center gap-4 py-1">
                            <div className="flex-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
                            <span className="shrink-0 text-[10px] font-medium tracking-wide text-text-secondary/50 dark:text-gray-500">
                              {item.label}
                            </span>
                            <div className="flex-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
                          </div>
                        );
                      }

                      const message = item.message!;
                      const isSister = message.sender === "sister";

                      if (isSister) {
                        return (
                          <div
                            key={message.id}
                            className="group flex items-start gap-3 animate-fade-in"
                          >
                            <div className="sticky top-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-sm">
                              <span className="material-symbols-outlined text-sm text-white">spa</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2.5">
                                <span className="text-xs font-semibold text-primary dark:text-primary-light">
                                  Sister
                                </span>
                                <span className="text-[9px] text-text-secondary/40 dark:text-gray-600">
                                  {formatRelativeTime(message.timestamp)}
                                </span>
                              </div>
                              <div className="mt-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.03] dark:bg-white/[0.06] dark:ring-white/[0.06]">
                                <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap dark:text-gray-100">
                                  <StreamedText
                                    text={message.text}
                                    animate={message.animate}
                                    onTick={() => {
                                      if (!showScrollButton) scrollToBottom();
                                    }}
                                  />
                                </p>
                              </div>

                              {message.audio && (
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const audio = audioElements[message.id];
                                      if (audio) {
                                        if (playingAudioId === message.id) {
                                          audio.pause();
                                          setPlayingAudioId(null);
                                        } else {
                                          Object.values(audioElements).forEach((a) => a.pause());
                                          audio.play();
                                          setPlayingAudioId(message.id);
                                        }
                                      }
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-light"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {playingAudioId === message.id ? "pause_circle" : "play_circle"}
                                    </span>
                                    {message.audio.durationSeconds.toFixed(0)}s
                                  </button>
                                </div>
                              )}

                              {message.language && message.language !== "eng" && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary dark:bg-primary/20 dark:text-primary-light">
                                    <span className="material-symbols-outlined text-[10px]">language</span>
                                    {SUPPORTED_LANGUAGES[message.language as SupportedLanguageCode]?.name || message.language}
                                  </span>
                                  <button
                                    onClick={() => copyMessageText(message.id, message.text)}
                                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-text-secondary/60 transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/10 dark:hover:text-white"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">
                                      {copiedMessageId === message.id ? "check" : "content_copy"}
                                    </span>
                                    {copiedMessageId === message.id ? "Copied" : "Copy"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // User message
                      return (
                        <div
                          key={message.id}
                          className="group flex justify-end animate-fade-in"
                        >
                          <div className="flex max-w-[80%] flex-col items-end sm:max-w-[70%]">
                            <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-white shadow-md shadow-primary/20">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.text}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 px-1">
                              <span className="text-[9px] text-text-secondary/40 dark:text-gray-600">
                                {formatRelativeTime(message.timestamp)}
                              </span>
                              <span className="material-symbols-outlined text-[9px] text-text-secondary/30 dark:text-gray-600">
                                check
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="mt-6 animate-fade-in flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-sm">
                      <span className="material-symbols-outlined text-sm text-white">spa</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-white/[0.06] dark:ring-white/[0.06]">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-text-secondary/70 dark:text-gray-400">
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
                className="absolute bottom-4 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-black/[0.06] bg-white text-text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-gray-800 dark:text-white"
              >
                <span className="material-symbols-outlined text-lg">arrow_downward</span>
              </button>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-black/[0.04] bg-white/80 backdrop-blur-md dark:border-white/[0.05] dark:bg-[#140e1a]/80">
            <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-1.5 rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-md dark:border-white/10 dark:bg-white/[0.05] sm:gap-2 sm:p-2">
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
                    placeholder={isListening ? "Listening..." : "Message Sister..."}
                    disabled={isTyping || isListening}
                    rows={1}
                    className="max-h-[120px] flex-1 resize-none border-none bg-transparent px-1 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 dark:text-white sm:max-h-[150px] sm:px-2"
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      disabled={isTyping}
                      className={`touch-target shrink-0 rounded-xl p-2.5 transition-all sm:p-2.5 ${
                        isListening
                          ? "animate-pulse bg-red-500 text-white shadow-md"
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
                    className="touch-target shrink-0 rounded-xl bg-primary p-2.5 text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isTyping ? "hourglass_top" : "arrow_upward"}
                    </span>
                  </button>
                </div>
              </form>

              <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                <p className="text-[9px] text-text-secondary/50 dark:text-gray-500 sm:text-[10px]">
                  Sister is an AI companion. For emergencies, call{" "}
                  <a href="tel:116" className="font-medium text-primary hover:underline">
                    Sauti 116
                  </a>
                </p>
                <div className="flex items-center gap-3">
                  {inputValue.length > MAX_MESSAGE_LENGTH - 200 && (
                    <span
                      className={`text-[10px] font-medium ${
                        isOverLimit
                          ? "text-red-500"
                          : "text-text-secondary/50 dark:text-gray-500"
                      }`}
                    >
                      {inputValue.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  )}
                  <span className="hidden text-[9px] text-text-secondary/40 dark:text-gray-500 sm:inline">
                    Enter to send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.35);
        }
      `}</style>
    </div>
  );
}