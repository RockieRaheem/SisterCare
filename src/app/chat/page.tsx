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

const isLikelyUiMarkup = (text: string) =>
  /<div class="jsx-[^"]+"/.test(text) &&
  text.includes("material-symbols-outlined");

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
  const { user, loading: authLoading } = useAuth();
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
  const [isFreshChat, setIsFreshChat] = useState(false);
  const [audioElements, setAudioElements] = useState<
    Record<string, HTMLAudioElement>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
      setIsFreshChat(true);
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
        setIsFreshChat(true);
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
  }, [messages, scrollToBottom]);

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
      setActiveConversationId(conversationId);
      const conversationMeta = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId,
      );
      const isNewChat = conversationMeta?.title === "New Chat";

      // Skip Firestore for local chats
      if (conversationId.startsWith("local-")) {
        setMessages([]);
        setIsFreshChat(!!isNewChat);
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
      setIsFreshChat(cleanedMessages.length === 0 && !!isNewChat);
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
        setIsFreshChat(false);
        setError(null);
      } else {
        setError("Failed to load conversation. Please try again.");
      }
      setSidebarOpen(false);
    } finally {
      setActionLoading(null);
    }
  }, []);

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
        setConversations(userConversations);
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
          setIsFreshChat(false);
          setLoading(false);
          return;
        }
      }

      if (userConversations.length > 0) {
        await loadConversation(userConversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
        setIsFreshChat(false);
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
      setIsFreshChat(false);
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
    [activeConversationId, loadConversation],
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
      setIsFreshChat(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce(
    (acc, conv) => {
      const dateKey = formatDate(conv.updatedAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(conv);
      return acc;
    },
    {} as Record<string, ChatConversation[]>,
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center safe-top safe-bottom">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#f4e8ff_0%,_#f7f6f8_45%,_#ffffff_100%)] dark:bg-background-dark">
      <div className="pointer-events-none absolute -top-28 -right-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-pink-300/20 blur-3xl" />
      {/* Main Header - Same as other pages */}
      <Header variant="app" />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar Overlay for Mobile */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-300 lg:hidden ${
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar - Desktop always visible, Mobile slide-in */}
        <aside
          className={`
            fixed lg:relative z-50 h-[calc(100vh-65px)] flex flex-col
            bg-white/90 dark:bg-card-dark/95 backdrop-blur-xl
            border-r border-white/50 dark:border-border-dark
            transition-all duration-300 ease-out
            ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
            w-[85vw] xs:w-80 sm:w-80 lg:w-80
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/70 dark:border-border-dark">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-lg sm:text-xl">
                    chat
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary dark:text-white text-xs sm:text-sm">
                    Chat History
                  </h2>
                  <p className="text-[10px] sm:text-xs text-text-secondary dark:text-gray-400">
                    {conversations.length} conversations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:rounded-xl transition-colors lg:hidden touch-target"
              >
                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-xl">
                  close
                </span>
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-2 sm:p-3">
              <button
                onClick={handleNewChat}
                disabled={actionLoading === "new"}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50 touch-target"
              >
                {actionLoading === "new" ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">
                      add
                    </span>
                    <span>New Chat</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Conversations */}
            <div className="px-2 sm:px-3 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 text-base sm:text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-lg sm:rounded-xl text-xs sm:text-sm text-text-primary dark:text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2.5 space-y-1.5 custom-scrollbar">
              {Object.keys(groupedConversations).length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-text-secondary dark:text-gray-400">
                      forum
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    No conversations yet
                  </p>
                  <p className="text-xs text-text-secondary/60 dark:text-gray-500 mt-1">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                Object.entries(groupedConversations).map(
                  ([dateGroup, convs]) => (
                    <div key={dateGroup} className="mb-4">
                      <p className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-500 uppercase tracking-wider">
                        {dateGroup}
                      </p>
                      <div className="space-y-1">
                        {convs.map((conversation) => (
                          <div key={conversation.id} className="relative group">
                            {editingTitle === conversation.id ? (
                              <div className="px-2 py-1">
                                <input
                                  type="text"
                                  value={editTitleValue}
                                  onChange={(e) =>
                                    setEditTitleValue(e.target.value)
                                  }
                                  onBlur={() =>
                                    handleRenameChat(conversation.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleRenameChat(conversation.id);
                                    if (e.key === "Escape")
                                      setEditingTitle(null);
                                  }}
                                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-2 border-primary rounded-lg text-text-primary dark:text-white focus:outline-none"
                                  autoFocus
                                />
                              </div>
                            ) : deleteConfirm === conversation.id ? (
                              <div className="mx-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-2">
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                  Delete this chat?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleDeleteChat(conversation.id)
                                    }
                                    disabled={
                                      actionLoading ===
                                      `delete-${conversation.id}`
                                    }
                                    className="flex-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium"
                                  >
                                    {actionLoading ===
                                    `delete-${conversation.id}` ? (
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                      "Delete"
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  actionLoading !== conversation.id &&
                                  loadConversation(conversation.id)
                                }
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all cursor-pointer border ${
                                  actionLoading === conversation.id
                                    ? "opacity-50 cursor-wait"
                                    : ""
                                } ${
                                  activeConversationId === conversation.id
                                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40"
                                    : "border-transparent hover:border-primary/20 hover:bg-white dark:hover:bg-gray-800"
                                }`}
                              >
                                <div
                                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                                    activeConversationId === conversation.id
                                      ? "bg-primary text-white"
                                      : "bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    chat_bubble
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      activeConversationId === conversation.id
                                        ? "text-primary dark:text-white"
                                        : "text-text-primary dark:text-white"
                                    }`}
                                  >
                                    {actionLoading === conversation.id
                                      ? "Loading..."
                                      : conversation.title || "Untitled"}
                                  </p>
                                  <p className="text-xs text-text-secondary dark:text-gray-500 truncate mt-0.5">
                                    {conversation.lastMessage ||
                                      "No messages yet"}
                                  </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditTitleValue(
                                        conversation.title || "",
                                      );
                                      setEditingTitle(conversation.id);
                                    }}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Rename"
                                  >
                                    <span className="material-symbols-outlined text-sm text-text-secondary dark:text-gray-400">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm(conversation.id);
                                    }}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <span className="material-symbols-outlined text-sm text-red-500">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-gray-200/70 dark:border-border-dark">
              <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/60">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user?.displayName?.charAt(0) ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                    {user?.displayName || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-border-dark bg-white/80 dark:bg-card-dark/90 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors lg:hidden"
              >
                <span className="material-symbols-outlined text-text-primary dark:text-white">
                  menu
                </span>
              </button>
              <button
                onClick={handleNewChat}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="New chat"
              >
                <span className="material-symbols-outlined text-text-primary dark:text-white">
                  edit_square
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-text-primary dark:text-white">
                  {conversations.find((c) => c.id === activeConversationId)
                    ?.title || "Start a conversation"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/library"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="Library"
              >
                <span className="material-symbols-outlined text-text-primary dark:text-white">
                  menu_book
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="Dashboard"
              >
                <span className="material-symbols-outlined text-text-primary dark:text-white">
                  dashboard
                </span>
              </Link>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto bg-transparent">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {agentActionStatuses.length > 0 && (
                <div className="bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm animate-fade-in">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-semibold text-text-secondary mb-2">
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

              {isFreshChat && !isTyping && (
                <div className="rounded-3xl border border-white/70 dark:border-gray-700 bg-white/85 dark:bg-card-dark/95 backdrop-blur-xl shadow-xl p-5 sm:p-7 animate-fade-in">
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-text-secondary dark:text-gray-400">
                    Fresh chat
                  </p>
                  <h3 className="mt-2 text-lg sm:text-2xl font-bold text-text-primary dark:text-white">
                    What would you like to talk about today?
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
                    Start a new private conversation, or open a previous one
                    from the left panel to continue exactly where you stopped.
                  </p>
                </div>
              )}

              {!activeConversationId &&
                !isFreshChat &&
                messages.length === 0 &&
                !isTyping && (
                  <div className="rounded-3xl border border-white/70 dark:border-gray-700 bg-white/80 dark:bg-card-dark/90 backdrop-blur-xl shadow-xl p-5 sm:p-7 animate-fade-in">
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-text-secondary dark:text-gray-400">
                      No chat selected
                    </p>
                    <h3 className="mt-2 text-lg sm:text-2xl font-bold text-text-primary dark:text-white">
                      Pick a conversation or start a new one
                    </h3>
                    <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
                      Use the sidebar to open a previous chat or tap New Chat to
                      begin.
                    </p>
                  </div>
                )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-4 animate-fade-in ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md ${
                      message.sender === "sister"
                        ? "bg-gradient-to-br from-primary to-purple-600"
                        : "bg-gradient-to-br from-orange-400 to-pink-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-white text-base sm:text-lg">
                      {message.sender === "sister" ? "spa" : "person"}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`flex-1 max-w-[85%] sm:max-w-[80%] ${message.sender === "user" ? "flex flex-col items-end" : ""}`}
                  >
                    <div
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm ${
                        message.sender === "sister"
                          ? "bg-white dark:bg-card-dark rounded-tl-sm sm:rounded-tl-md"
                          : "bg-gradient-to-r from-primary to-purple-600 text-white rounded-tr-sm sm:rounded-tr-md"
                      }`}
                    >
                      <p
                        className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                          message.sender === "sister"
                            ? "text-text-primary dark:text-gray-200"
                            : "text-white"
                        }`}
                      >
                        {message.text}
                      </p>
                      {/* Audio Player for Sister Messages */}
                      {message.sender === "sister" && message.audio && (
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
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
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title={
                                playingAudioId === message.id ? "Pause" : "Play"
                              }
                            >
                              <span className="material-symbols-outlined text-base text-primary">
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
                            <span className="text-[10px] sm:text-xs text-text-secondary dark:text-gray-400">
                              {message.audio.durationSeconds.toFixed(0)}s
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Language Badge for Sister Messages */}
                      {message.sender === "sister" &&
                        message.language &&
                        message.language !== "eng" && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="inline-block text-[9px] sm:text-[10px] px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light rounded-md font-medium">
                              🌍{" "}
                              {SUPPORTED_LANGUAGES[
                                message.language as SupportedLanguageCode
                              ]?.name || message.language}
                            </span>
                          </div>
                        )}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-text-secondary dark:text-gray-500 mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-2 sm:gap-4 animate-fade-in">
                  <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-white text-base sm:text-lg">
                      spa
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card-dark rounded-xl sm:rounded-2xl rounded-tl-sm sm:rounded-tl-md px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - positioned above bottom nav */}
          <div className="border-t border-gray-200/70 dark:border-border-dark bg-white/80 dark:bg-card-dark/90 backdrop-blur-xl pb-[calc(var(--bottom-nav-height,72px)+env(safe-area-inset-bottom))] lg:pb-4">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
              {/* Language Selector */}
              <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">
                  🌍 Language:
                </span>
                <select
                  value={userLanguage}
                  onChange={(e) =>
                    setUserLanguage(e.target.value as SupportedLanguageCode)
                  }
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl text-text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  {CHAT_LANGUAGE_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {SUPPORTED_LANGUAGES[code].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icebreakers for new chats */}
              {isFreshChat && (
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {icebreakers.map((icebreaker) => (
                    <button
                      key={icebreaker.text}
                      onClick={() => sendMessage(icebreaker.text)}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all text-left group touch-target"
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${icebreaker.color} flex items-center justify-center shrink-0`}
                      >
                        <span className="material-symbols-outlined text-white text-sm sm:text-lg">
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

              {/* Input Box */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-2 sm:gap-3 bg-white dark:bg-gray-800 rounded-2xl p-1.5 sm:p-2 border border-gray-200 dark:border-gray-700 shadow-lg shadow-primary/5 focus-within:border-primary transition-all">
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
                    className="flex-1 bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-text-primary dark:text-white placeholder:text-text-secondary text-xs sm:text-sm px-2 sm:px-3 py-2 max-h-[120px] sm:max-h-[150px]"
                  />
                  {/* Voice Input Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      disabled={isTyping}
                      className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all touch-target ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40"
                          : "bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                      title={isListening ? "Stop listening" : "Voice input"}
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg">
                        {isListening ? "mic_off" : "mic"}
                      </span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25 touch-target"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">
                      send
                    </span>
                  </button>
                </div>
              </form>

              <p className="text-center text-[9px] sm:text-[10px] text-text-secondary dark:text-gray-500 mt-2 sm:mt-3">
                Sister is an AI companion. For emergencies, call{" "}
                <a
                  href="tel:116"
                  className="text-primary hover:underline font-medium"
                >
                  Sauti 116
                </a>{" "}
                or see a healthcare professional.
              </p>
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
