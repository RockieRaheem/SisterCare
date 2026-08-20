"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { readApiResponse } from "@/lib/apiResponse";
import {
  addMessage,
  getMessages,
  getUserConversations,
  createNewChat,
  updateConversationTitle,
  updateConversationPreview,
  getUserProfile,
  updateUserPreferences,
} from "@/lib/dataClient";
import {
  loadLocalConversations,
  mergeConversationHistory,
  saveLocalConversation,
  deleteLocalConversation,
  createLocalConversation,
  updateLocalConversationTitle,
  touchLocalConversation,
  loadLocalMessages,
  saveLocalMessage,
  cleanDeletedTombstones,
  migrateLocalConversationId,
} from "@/lib/localChatStore";
import { AgentActionStatus, ChatConversation, UserProfile, ChatMessage } from "@/types";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  getSunbirdVoices,
  normalizeSupportedLanguageCode,
} from "@/lib/sunbird";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import {
  MAX_VOICE_RECORDING_SECONDS,
  selectRecordingFormat,
  validateVoiceRecording,
  voiceCaptureConstraints,
  voiceFileName,
} from "@/lib/speechCapture";
import {
  readVoiceRepliesPreference,
  selectedVoiceForLanguage,
  speechLocale,
  VOICE_REPLIES_STORAGE_KEY,
} from "@/lib/voicePlayback";

interface Message {
  id: string;
  sender: "user" | "sister";
  text: string;
  timestamp: Date;
  language?: string;
  audio?: {
    url: string;
    durationSeconds: number;
    language?: SupportedLanguageCode;
  };
  animate?: boolean;
}

interface ChatApiResponse {
  response: string;
  error?: string;
  code?: string;
  clientAction?:
    | {
        type: "navigate";
        href:
          | "/dashboard"
          | "/library"
          | "/counsellors"
          | "/sessions"
          | "/profile"
          | "/settings";
        search?: string;
        articleId?: number;
      }
    | { type: "sign_out" };
  actionStatuses?: AgentActionStatus[];
  session?: { id: string; state: string; priority: string };
  language?: string;
  languageName?: string;
  audio?: {
    url: string;
    durationSeconds: number;
    mimeType: string;
    language?: SupportedLanguageCode;
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

const CHAT_LANGUAGE_OPTIONS: SupportedLanguageCode[] = [
  "eng",
  "lug",
  "ach",
  "lgg",
  "nyn",
  "teo",
  "swa",
];
const MAX_MESSAGE_LENGTH = 2000;

const CHAT_WORKSPACE_NAVIGATION = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/analytics", icon: "timeline", label: "Track" },
  { href: "/counsellors", icon: "support_agent", label: "Counsellors" },
  { href: "/library", icon: "menu_book", label: "Library" },
] as const;

function parseConversation(payload: Record<string, unknown>): ChatConversation {
  return {
    id: String(payload.id || ""),
    userId: String(payload.userId || ""),
    title: String(payload.title || "New Chat"),
    type: payload.type === "counsellor" ? "counsellor" : "ai_support",
    status: String(payload.status || "active"),
    retentionMode: payload.retentionMode === "session" ? "session" : "account",
    lastMessage: String(payload.lastMessage || ""),
    messageCount: Number(payload.messageCount || 0),
    createdAt: new Date(String(payload.createdAt || Date.now())),
    updatedAt: new Date(String(payload.updatedAt || Date.now())),
  } as ChatConversation;
}

async function conversationRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getSupabaseBrowserClient().auth.getSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null);
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Conversation storage request failed",
    );
  }
  return payload as T;
}

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
  const looksSeededByTitle = new Set([
    "dummy",
    "sample",
    "demo",
    "default",
    "chat 1",
    "chat 2",
  ]).has(title);

  return isLikelyUiMarkup(lastMessage) || looksSeededByTitle;
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
    icon: "heart_broken",
    label: "Something happened",
    text: "I need to talk about something that hurt me",
    tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  },
  {
    icon: "mood",
    label: "Feeling anxious",
    text: "I feel anxious and I don't know what to do",
    tone: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light",
  },
  {
    icon: "diversity_1",
    label: "Relationships",
    text: "I'm struggling with a relationship",
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  },
  {
    icon: "health_and_safety",
    label: "Private health",
    text: "I have a private health question",
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscriptReady, setVoiceTranscriptReady] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [agentActionStatuses, setAgentActionStatuses] = useState<AgentActionStatus[]>([]);
  const [counsellorProfile, setCounsellorProfile] = useState<ChatApiResponse["counsellorProfile"] | null>(null);
  const [activeSessionCard, setActiveSessionCard] = useState<ChatApiResponse["session"] | null>(null);
  const [userLanguage, setUserLanguage] = useState<SupportedLanguageCode>("eng");
  const languageInitializedForUserRef = useRef<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [preparingAudioId, setPreparingAudioId] = useState<string | null>(null);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const [voicePlaybackError, setVoicePlaybackError] = useState<string | null>(null);
  const [freshChatId, setFreshChatId] = useState<string | null>(null);
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
  const recordingStartedAtRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const voiceRepliesEnabledRef = useRef(false);
  const playbackRequestRef = useRef(0);
  const isFreshChat =
    activeConversationId !== null && activeConversationId === freshChatId;
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const createFreshConversation = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    // Always create locally for instant reliability
    const localConv = createLocalConversation(
      user.uid,
      "New Chat",
      userProfile?.privacyPreferences.conversationRetention || "account",
    );
    setConversations((prev) => [localConv, ...prev]);
    setActiveConversationId(localConv.id);
    setMessages([]);
    setFreshChatId(localConv.id);

    // Create the canonical thread through the authenticated server API. The
    // browser copy is only a short-lived offline cache and is intentionally
    // purged at sign-out.
    try {
      const response = await conversationRequest<{
        conversation: Record<string, unknown>;
      }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      });
      const updated = parseConversation(response.conversation);
      migrateLocalConversationId(localConv.id, updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === localConv.id ? updated : c)),
      );
      setActiveConversationId(updated.id);
      setFreshChatId(updated.id);
      return updated.id;
    } catch {
      // Keep the local thread for a temporary offline session, but do not
      // mistake it for durable cross-session history.
      return localConv.id;
    }
  }, [user, userProfile]);

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
    if (!user) {
      languageInitializedForUserRef.current = null;
      return;
    }
    if (
      userProfile?.preferences?.language &&
      languageInitializedForUserRef.current !== user.uid
    ) {
      const preferred = normalizeSupportedLanguageCode(
        userProfile.preferences.language,
      );
      setUserLanguage(preferred);
      languageInitializedForUserRef.current = user.uid;
    }
  }, [user, userProfile]);

  const changeReplyLanguage = useCallback(
    (language: SupportedLanguageCode) => {
      setUserLanguage(language);
      if (!user) return;
      languageInitializedForUserRef.current = user.uid;
      void updateUserPreferences(user.uid, {
        language,
      }).catch((languageError) => {
        console.warn("Could not persist reply language:", languageError);
        setError("Your reply language changed for this chat, but could not be saved to your profile.");
      });
    },
    [user],
  );

  useEffect(() => {
    const enabled = readVoiceRepliesPreference(
      typeof window !== "undefined" ? window.localStorage : undefined,
    );
    voiceRepliesEnabledRef.current = enabled;
    setVoiceRepliesEnabled(enabled);
  }, []);

  const stopAllSpokenAudio = useCallback(() => {
    playbackRequestRef.current += 1;
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioElementsRef.current.clear();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudioId(null);
    setPreparingAudioId(null);
  }, []);

  const playMessageAudio = useCallback(async (message: Message) => {
    if (playingAudioId === message.id) {
      const current = audioElementsRef.current.get(message.id);
      current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingAudioId(null);
      return;
    }

    stopAllSpokenAudio();
    const playbackRequest = ++playbackRequestRef.current;
    setPreparingAudioId(message.id);
    setVoicePlaybackError(null);

    try {
      const language = normalizeSupportedLanguageCode(
        message.language || userLanguage,
      );
      const voice = selectedVoiceForLanguage(language, {});
      if (!voice) {
        throw new Error(
          `${SUPPORTED_LANGUAGES[language].name} does not currently have an available Sunbird voice.`,
        );
      }
      const response = await authenticatedFetch("/api/language/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.text, language, voice }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.data?.url) {
        throw new Error(result?.error || "Spoken reply unavailable");
      }
      const audioUrl = result.data.url;

      if (playbackRequest !== playbackRequestRef.current) return;

      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => {
        setPlayingAudioId(null);
        setVoicePlaybackError(
          "This spoken reply could not be played. The written response is still available.",
        );
      };
      audioElementsRef.current.set(message.id, audio);
      await audio.play();
      if (playbackRequest !== playbackRequestRef.current) {
        audio.pause();
        return;
      }
      setPlayingAudioId(message.id);
    } catch (playbackError) {
      if (playbackRequest !== playbackRequestRef.current) return;
      const canUseDeviceVoice =
        (message.language || userLanguage) === "eng" &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window;
      if (canUseDeviceVoice) {
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = speechLocale(message.language || userLanguage);
        utterance.rate = 0.95;
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = () => setPlayingAudioId(null);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setPlayingAudioId(message.id);
      } else {
        setVoicePlaybackError(
          playbackError instanceof Error
            ? playbackError.message
            : "Spoken reply unavailable. The written response is still available.",
        );
      }
    } finally {
      if (playbackRequest === playbackRequestRef.current) {
        setPreparingAudioId(null);
      }
    }
  }, [playingAudioId, stopAllSpokenAudio, userLanguage]);

  const toggleVoiceReplies = useCallback(() => {
    const enabled = !voiceRepliesEnabledRef.current;
    voiceRepliesEnabledRef.current = enabled;
    setVoiceRepliesEnabled(enabled);
    try {
      window.localStorage.setItem(
        VOICE_REPLIES_STORAGE_KEY,
        enabled ? "true" : "false",
      );
    } catch {}
    if (!enabled) {
      stopAllSpokenAudio();
      return;
    }
    const latestReply = [...messages]
      .reverse()
      .find((message) => message.sender === "sister");
    if (latestReply) void playMessageAudio(latestReply);
  }, [messages, playMessageAudio, stopAllSpokenAudio]);

  const startVoiceRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      setIsListening(true);
      setRecordingSeconds(0);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia(
        voiceCaptureConstraints(),
      );
      streamRef.current = stream;

      const format = selectRecordingFormat(
        typeof MediaRecorder.isTypeSupported === "function"
          ? MediaRecorder.isTypeSupported.bind(MediaRecorder)
          : undefined,
      );
      const mediaRecorder = format.mimeType
        ? new MediaRecorder(stream, { mimeType: format.mimeType })
        : new MediaRecorder(stream);
      recordingRef.current = mediaRecorder;
      recordingStartedAtRef.current = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - recordingStartedAtRef.current) / 1000,
        );
        setRecordingSeconds(elapsed);
        if (
          elapsed >= MAX_VOICE_RECORDING_SECONDS &&
          recordingRef.current?.state === "recording"
        ) {
          recordingRef.current.stop();
          setIsListening(false);
        }
      }, 250);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setIsListening(false);
        const durationMs = Date.now() - recordingStartedAtRef.current;
        const recordedMimeType =
          mediaRecorder.mimeType || format.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recordedMimeType,
        });
        audioChunksRef.current = [];

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setError(null);
        const validationError = validateVoiceRecording({
          bytes: audioBlob.size,
          durationMs,
        });
        if (validationError) {
          setError(validationError);
          return;
        }
        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", audioBlob, voiceFileName(format));
          form.append("language", userLanguage);
          form.append("durationMs", String(durationMs));
          const response = await authenticatedFetch("/api/language/transcribe", {
            method: "POST",
            body: form,
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.data?.transcript) {
            throw new Error(result?.error || "Voice transcription failed");
          }
          setInputValue(result.data.transcript);
          setVoiceTranscriptReady(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        } catch (transcriptionError) {
          setError(
            transcriptionError instanceof Error
              ? transcriptionError.message
              : "Speech-to-text conversion failed. Please try again or type your message.",
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.onerror = () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setError("Recording failed. Please try again.");
        setIsListening(false);
      };

      mediaRecorder.start(1_000);
    } catch (recordingError) {
      const message =
        recordingError instanceof DOMException &&
        recordingError.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow microphone access in your browser settings and try again."
          : "Unable to access the microphone on this device.";
      setError(message);
      setIsListening(false);
    }
  }, [userLanguage]);

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
      void startVoiceRecording();
    }
  }, [isListening, startVoiceRecording]);

  useEffect(
    () => () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingRef.current?.state === "recording") {
        recordingRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    const audioElements = audioElementsRef.current;
    return () => {
      audioElements.forEach((audio) => audio.pause());
      audioElements.clear();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    stopAllSpokenAudio();
  }, [activeConversationId, stopAllSpokenAudio]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

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
    } catch {}
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
    } catch {
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
    // A blank new chat never inherits a global draft. Drafts belong only to a
    // concrete, selected conversation; otherwise text from one thread can
    // appear when the user intentionally starts another.
    if (!activeConversationId) {
      setInputValue("");
      setVoiceTranscriptReady(false);
      if (inputRef.current) inputRef.current.style.height = "auto";
      return;
    }
    const key = `sistercare-chat-draft-${activeConversationId}`;
    const existingDraft = window.localStorage.getItem(key) || "";
    setInputValue(existingDraft);
    setVoiceTranscriptReady(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      if (window.innerWidth >= 1024) {
        inputRef.current.focus();
      }
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeConversationId) return;
    const key = `sistercare-chat-draft-${activeConversationId}`;
    window.localStorage.setItem(key, inputValue);
  }, [activeConversationId, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setVoiceTranscriptReady(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(
          inputRef.current.scrollHeight,
          window.innerWidth < 640 ? 112 : 160,
        ) + "px";
    }
  };

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    setActionLoading("new");
    try {
      if (activeConversation?.retentionMode === "session") {
        if (!activeConversation.id.startsWith("local-")) {
          await conversationRequest(
            `/api/conversations/${encodeURIComponent(activeConversation.id)}`,
            { method: "DELETE" },
          );
        }
        deleteLocalConversation(activeConversation.id);
        setConversations((previous) =>
          previous.filter((conversation) => conversation.id !== activeConversation.id),
        );
      }
      // Follow the familiar new-chat pattern: start with a clean composer and
      // create the durable conversation only once the user sends a message.
      setActiveConversationId(null);
      setMessages([]);
      setFreshChatId(null);
      setInputValue("");
      setVoiceTranscriptReady(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sistercare-chat-draft-global");
      }
      setAgentActionStatuses([]);
      setCounsellorProfile(null);
      setActiveSessionCard(null);
      setError(null);
      setSidebarOpen(false);
      setConversationMenuOpen(null);
    } catch {
      setError("Failed to create new chat. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }, [activeConversation, user]);

  const loadConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setActionLoading(conversationId);
    setFreshChatId(null);
    setConversationMenuOpen(null);
    setActiveConversationId(conversationId);
    setMessages([]);

    // Load messages from local storage first (always works)
    try {
      const localMessages = loadLocalMessages(conversationId);
      const cleaned = localMessages
        .filter((msg) => !isLikelyUiMarkup(msg.content))
        .map((msg) => ({
          id: msg.id,
          sender: (msg.sender === "user" ? "user" : "sister") as Message["sender"],
          text: msg.content,
          timestamp: msg.timestamp,
          language: normalizeSupportedLanguageCode(msg.metadata?.language),
        }));

      if (cleaned.length > 0) {
        setMessages(cleaned);
      }

      // The server route is the durable transcript source. Local storage is
      // deliberately a fallback because it is cleared on sign-out.
      try {
        const response = await conversationRequest<{
          messages: Array<Record<string, unknown>>;
        }>(`/api/conversations/${encodeURIComponent(conversationId)}`);
        const supabaseCleaned = response.messages
          .filter((msg) => !isLikelyUiMarkup(String(msg.content)))
          .map((msg) => ({
            id: String(msg.id),
            sender: (msg.sender === "user" ? "user" : "sister") as Message["sender"],
            text: String(msg.content),
            timestamp: new Date(String(msg.timestamp)),
            language: normalizeSupportedLanguageCode(
              (msg.metadata as Record<string, unknown> | undefined)?.language as string | undefined,
            ),
          }));
        if (supabaseCleaned.length > 0) {
          setMessages(supabaseCleaned);
          supabaseCleaned.forEach((msg) => {
            saveLocalMessage(conversationId, {
              id: msg.id,
              conversationId,
              sender: msg.sender === "user" ? "user" : "ai",
              content: msg.text,
              timestamp: msg.timestamp,
              read: true,
              metadata: { language: msg.language || "eng" },
            });
          });
        }
      } catch {
        // Local data is sufficient
      }

      // If we have no messages at all, try loading from local storage as final fallback
      if (cleaned.length === 0) {
        const finalLocal = loadLocalMessages(conversationId);
        if (finalLocal.length > 0) {
          setMessages(
            finalLocal
              .filter((msg) => !isLikelyUiMarkup(msg.content))
              .map((msg) => ({
                id: msg.id,
                sender: (msg.sender === "user" ? "user" : "sister") as Message["sender"],
                text: msg.content,
                timestamp: msg.timestamp,
                language: normalizeSupportedLanguageCode(msg.metadata?.language),
              })),
          );
        }
      }

      setError(null);
    } catch {
      setMessages([]);
    }
    setSidebarOpen(false);
    setContextMenuId(null);
    setActionLoading(null);
  }, []);

  const openConversationFromSidebar = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;
      // A previous Supabase/local-storage read can fail transiently. Allow a
      // tap on the active but empty conversation to retry instead of trapping
      // the user in a blank chat view.
      if (conversationId === activeConversationId && messages.length > 0) return;
      await loadConversation(conversationId);
    },
    [activeConversationId, loadConversation, messages.length],
  );

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch {}
    } catch {}

    // Read the server-owned index so chats survive logging out, changing
    // browsers, and clearing this device's private cache.
    let supabaseConvs: ChatConversation[] = [];
    try {
      const response = await conversationRequest<{
        conversations: Array<Record<string, unknown>>;
      }>("/api/conversations");
      supabaseConvs = response.conversations.map(parseConversation);
      const cleanSupabase = supabaseConvs.filter(
        (c) => !isLikelyDummyConversation(c),
      );
      // Sync Supabase conversations to local storage
      cleanSupabase.forEach((c) => saveLocalConversation(c));
      // Clean tombstones for conversations that still exist in Supabase
      cleanDeletedTombstones(cleanSupabase.map((c) => c.id));
    } catch {}

    // Merge: prefer local data (which has delete tombstones), supplemented by Supabase
    const merged = mergeConversationHistory(user.uid, supabaseConvs.filter(
      (conversation) => !isLikelyDummyConversation(conversation),
    ));

    // History is available in the drawer, but every visit begins with a new
    // blank thread. Opening a past conversation is an intentional choice.
    setConversations(merged);
    setActiveConversationId(null);
    setMessages([]);
    setFreshChatId(null);

    setError(null);
    setLoading(false);
  }, [user]);

  // Save last active conversation ID for persistence across refreshes
  useEffect(() => {
    if (activeConversationId && typeof window !== "undefined") {
      window.localStorage.setItem("sistercare-last-active", activeConversationId);
    }
  }, [activeConversationId]);

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
        // Remove the local copy immediately, then make the server perform the
        // authorized cascade. Client rules intentionally keep messages
        // immutable, so a direct client delete leaves history behind.
        deleteLocalConversation(conversationId);

        let cloudDeletionFailed = false;
        if (!conversationId.startsWith("local-")) {
          try {
            const idToken = await getSupabaseBrowserClient().auth.getSession()
              .then(({ data }) => data.session?.access_token ?? null)
              .catch(() => null);
            const response = await fetch(
              `/api/conversations/${encodeURIComponent(conversationId)}`,
              {
                method: "DELETE",
                headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
              },
            );
            cloudDeletionFailed = !response.ok;
          } catch {
            cloudDeletionFailed = true;
          }
        }

        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        setDeleteModalId(null);
        setContextMenuId(null);

        if (conversationId === activeConversationId) {
          // Deleting an active thread returns to a clean new-chat state;
          // history is never opened without the user choosing it.
          setActiveConversationId(null);
          setMessages([]);
          setFreshChatId(null);
        }

        setError(
          cloudDeletionFailed
            ? "This chat was removed from this device, but cloud deletion could not finish. Please try again when you are online."
            : null,
        );
      } catch {
        setError(
          "This chat was removed from this device, but cloud deletion could not finish. Please try again when you are online.",
        );
      } finally {
        setActionLoading(null);
      }
    },
    [activeConversationId],
  );

  const handleRenameChat = useCallback(
    async (conversationId: string) => {
      if (!editTitleValue.trim()) {
        setEditingTitle(null);
        return;
      }

      setActionLoading(`rename-${conversationId}`);
      try {
        // Always update locally
        updateLocalConversationTitle(conversationId, editTitleValue.trim());

        // Update the durable server copy.
        try {
          await conversationRequest(
            `/api/conversations/${encodeURIComponent(conversationId)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ title: editTitleValue.trim() }),
            },
          );
        } catch {}

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, title: editTitleValue.trim() } : c,
          ),
        );
        setEditingTitle(null);
        setEditTitleValue("");
        setError(null);
      } catch {
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
    if (message.split(" ").length > 5) title += "...";
    return title.substring(0, 30);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user) return;
      stopAllSpokenAudio();

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
      touchLocalConversation(currentConversationId, text.trim());

      // Auto-generate title from the very first user message
      const generatedTitle = generateTitleFromMessage(text.trim());

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                lastMessage: text.trim().substring(0, 100),
                updatedAt: new Date(),
                title: c.title === "New Chat" || c.title === "New Conversation" || c.title === "Untitled"
                  ? generatedTitle
                  : c.title,
              }
            : c,
        ),
      );

      // Persist title update locally + server if it was the default. The
      // server also applies this rule, avoiding a React-state timing race.
      const currentConv = conversationsRef.current.find((c) => c.id === currentConversationId);
      if (!currentConv || ["New Chat", "New Conversation", "Untitled"].includes(currentConv.title)) {
        updateLocalConversationTitle(currentConversationId, generatedTitle);
        try {
          await conversationRequest(
            `/api/conversations/${encodeURIComponent(currentConversationId)}`,
            { method: "PATCH", body: JSON.stringify({ title: generatedTitle }) },
          );
        } catch {}
      }
      setInputValue("");
      setVoiceTranscriptReady(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`sistercare-chat-draft-${currentConversationId}`);
      }
      if (inputRef.current) inputRef.current.style.height = "auto";
      setIsTyping(true);
      setError(null);

      // Save user message locally
      saveLocalMessage(currentConversationId, {
        id: userMessage.id,
        conversationId: currentConversationId,
        sender: "user",
        content: text.trim(),
        timestamp: userMessage.timestamp,
        read: true,
      });

      // Persist the user turn through the authenticated server route. This is
      // what gives the agent durable memory across sessions and devices.
      try {
        await conversationRequest(
          `/api/conversations/${encodeURIComponent(currentConversationId)}`,
          { method: "POST", body: JSON.stringify({ sender: "user", content: text.trim() }) },
        );
      } catch {}

      try {
        const conversationHistory = currentMessages.slice(-30).map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

        const makeRequest = async (
          retryCount = 0,
        ): Promise<ChatApiResponse> => {
          // Supabase caches the ID token and auto-refreshes near expiry, so
          // fetching it per request is cheap. The server verifies it and uses
          // the token's uid — never the raw userId below — as the identity.
          const idToken = await getSupabaseBrowserClient().auth.getSession()
            .then(({ data }) => data.session?.access_token ?? null)
            .catch(() => null);
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
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

          const data = await readApiResponse<ChatApiResponse>(res);

          if (res.status === 429 && retryCount < 2) {
            const retryAfter = parseInt(
              res.headers.get("Retry-After") || "30", 10,
            );
            const waitMessage: Message = {
              id: `wait-${Date.now()}`,
              sender: "sister",
              text: `${data.response || "I'm thinking... please wait a moment!"} ⏳`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, waitMessage]);
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            setMessages((prev) => prev.filter((m) => m.id !== waitMessage.id));
            return makeRequest(retryCount + 1);
          }

          if (!res.ok) {
            throw new Error(data.response || data.error || "Failed to get response");
          }

          return data;
        };

        const data = await makeRequest();

        setAgentActionStatuses(data.actionStatuses || []);
        setCounsellorProfile(data.counsellorProfile || null);
        if (data.session) {
          setActiveSessionCard(data.session);
        }
        if (data.counsellorProfile?.profileUrl && typeof window !== "undefined") {
          router.push(data.counsellorProfile.profileUrl);
        }

        // Client actions are server-authorized intent responses. Complete them
        // before any best-effort chat persistence so a slow Supabase write can
        // never leave the user on this screen after we say an action happened.
        if (data.clientAction?.type === "navigate") {
          const query = new URLSearchParams();
          if (data.clientAction.search) {
            query.set("search", data.clientAction.search);
          }
          if (data.clientAction.articleId) {
            query.set("article", String(data.clientAction.articleId));
          }
          const destination = `${data.clientAction.href}${query.size ? `?${query.toString()}` : ""}`;
          router.push(destination);
          return;
        }

        if (data.clientAction?.type === "sign_out") {
          await signOut();
          router.replace("/auth/login");
          return;
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
                  language: normalizeSupportedLanguageCode(
                    data.audio.language || data.language,
                  ),
                }
              : undefined,
            animate: true,
          };

          setMessages((prev) => [...prev, sisterMessage]);
          if (voiceRepliesEnabledRef.current) {
            void playMessageAudio(sisterMessage);
          }

          // Save AI response locally
          saveLocalMessage(currentConversationId, {
            id: sisterMessage.id,
            conversationId: currentConversationId,
            sender: "ai",
            content: data.response,
            timestamp: sisterMessage.timestamp,
            read: true,
            metadata: { language: sisterMessage.language || "eng" },
          });

          touchLocalConversation(currentConversationId, data.response);

          // Persist the assistant turn through the same server-owned
          // transcript, rather than silently losing it with browser storage.
          try {
            await conversationRequest(
              `/api/conversations/${encodeURIComponent(currentConversationId)}`,
              {
                method: "POST",
                body: JSON.stringify({
                  sender: "ai",
                  content: data.response,
                  language: sisterMessage.language || "eng",
                }),
              },
            );
          } catch {}

          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConversationId
                ? { ...c, lastMessage: data.response.substring(0, 100), updatedAt: new Date() }
                : c,
            ),
          );
        }

      } catch (requestError) {
        const detail =
          requestError instanceof Error && requestError.message.trim()
            ? requestError.message.trim()
            : "I couldn’t complete that request. Please try again.";
        setAgentActionStatuses([{
          key: "agent-error",
          label: "Agent response failed",
          state: "failed",
        }]);

        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          sender: "sister",
          text: detail,
          timestamp: new Date(),
          animate: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [user, activeConversationId, messages, createFreshConversation, generateTitleFromMessage, userProfile, userLanguage, router, signOut, playMessageAudio, stopAllSpokenAudio],
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

  const emptyStateContent = isFreshChat
    ? {
        key: "fresh",
        title: "What would you like to talk through?",
        subtitle: "Share as little or as much as feels comfortable. You can begin with one sentence.",
        showIcebreakers: true,
      }
    : !activeConversationId
      ? {
          key: "none",
          title: "What would you like to talk through?",
          subtitle: "Share as little or as much as feels comfortable. You can begin with one sentence.",
          showIcebreakers: true,
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
        role="button"
        tabIndex={0}
        onClick={() => !isBusy && openConversationFromSidebar(conversation.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            !isBusy && openConversationFromSidebar(conversation.id);
          }
        }}
        aria-label={`Open conversation ${conversation.title || "Untitled"}`}
        className={`group relative flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
          isBusy ? "cursor-wait opacity-50" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
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
            {conversation.retentionMode === "session" && (
              <span
                className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                title="Deleted when this private session ends"
              >
                Private session
              </span>
            )}
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

        <div className="flex shrink-0 items-center opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenuId((prev) =>
                prev === conversation.id ? null : conversation.id,
              );
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/[0.06] dark:text-gray-400 dark:hover:bg-white/10"
            title="More options"
            aria-label={`More options for ${conversation.title || "conversation"}`}
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
                <span className="material-symbols-outlined text-sm">push_pin</span>
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
    return <AppShellSkeleton variant="chat" />;
  }

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-[#fff8fc] dark:bg-background-dark md:static md:h-screen">
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
      <header className="safe-top relative z-40 flex min-h-16 shrink-0 items-center justify-between border-b border-primary/10 bg-white/95 px-3 shadow-[0_1px_0_rgba(255,0,255,0.04)] backdrop-blur-xl dark:border-border-dark dark:bg-card-dark/95 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary/10 bg-primary/[0.04] px-3 text-primary transition-colors hover:bg-primary/10 lg:hidden"
            aria-label="Open chat history and navigation"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
            <span className="text-xs font-extrabold">Menu</span>
          </button>
          <div className="min-w-0">
            <span className="block max-w-[11rem] truncate text-sm font-bold text-text-primary dark:text-white sm:max-w-[16rem] lg:max-w-[20rem]">
              {activeConversationTitle}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Private support
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/report?type=ai_response&targetId=${encodeURIComponent(activeConversationId || "")}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30"
            title="Report a concern"
            aria-label="Report a concern about this conversation"
          >
            <span className="material-symbols-outlined text-xl">report</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden overscroll-none">
        {/* Sidebar Overlay */}
        <div
          className={`fixed inset-0 z-50 bg-black/35 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar — reduced width */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-[60] flex min-h-0 flex-col
            border-r border-primary/10 bg-white
            shadow-xl shadow-black/5
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            dark:border-border-dark dark:bg-card-dark
            lg:relative lg:inset-auto lg:shadow-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            lg:w-[19rem]
            w-[min(88vw,20rem)]
          `}
        >
          <div className="flex h-full flex-col">
            {/* Sidebar Header */}
            <div className="safe-top flex min-h-16 items-center justify-between border-b border-primary/10 px-4 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-primary-sm">
                  <span className="material-symbols-outlined text-lg text-white">favorite</span>
                </div>
                <div><span className="block text-sm font-extrabold text-text-primary dark:text-white">SisterCare</span><span className="block text-[10px] font-semibold text-text-secondary">Private conversations</span></div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="sidebar-icon-hover flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary dark:text-gray-400 lg:hidden"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>

            {/* New Chat + Search */}
            <div className="space-y-2 px-3 pb-3 pt-3">
              {/* New chat button */}
              <div className="relative group">
                <button
                  onClick={handleNewChat}
                  disabled={actionLoading === "new"}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white shadow-primary-sm transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
                >
                  {actionLoading === "new" ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">add_comment</span>
                      <span>New conversation</span>
                    </>
                  )}
                </button>
              </div>

              {/* Search */}
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary/60 dark:text-gray-500">
                    search
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations"
                    className="min-h-10 w-full rounded-xl border border-primary/10 bg-primary/[0.035] py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-white/[0.07]"
                  />
                </div>
              </div>
            </div>

            <div className="mx-3 mb-3">
              <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary/70">Navigation</p>
              <nav className="grid grid-cols-2 gap-1 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5" aria-label="Go to another SisterCare page">
                {CHAT_WORKSPACE_NAVIGATION.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-bold text-text-secondary transition-colors hover:bg-white hover:text-primary hover:shadow-sm dark:hover:bg-white/[0.06]">
                    <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Conversations List */}
            <div className="flex items-center justify-between px-4 pb-1 pt-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary/70">Chat history</p>
              <span className="rounded-full bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary" aria-label={`${conversations.length} saved conversations`}>{conversations.length}</span>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto px-1.5 py-1">
              {pinnedConversations.length === 0 &&
              Object.keys(groupedConversations).length === 0 ? (
                <div className="flex flex-col items-center px-4 py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03] dark:bg-white/[0.05]">
                    <span className="material-symbols-outlined text-xl text-text-secondary/50 dark:text-gray-400">
                      forum
                    </span>
                  </div>
                  <p className="text-xs font-medium text-text-secondary dark:text-gray-400">
                    {searchQuery ? "No matching chats" : "No conversations yet"}
                  </p>
                  {!searchQuery && (
                    <p className="mt-1 text-[10px] text-text-secondary/50 dark:text-gray-500">
                      Tap New to start
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {pinnedConversations.length > 0 && (
                    <div className="mb-2">
                      <p className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-gray-500">
                        <span className="material-symbols-outlined text-[10px]">push_pin</span>
                        Pinned
                      </p>
                      <div className="space-y-0.5">
                        {pinnedConversations.map((conv) => (
                          <div key={conv.id}>{renderConversationRow(conv)}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
                    <div key={dateGroup} className="mb-2">
                      <p className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-gray-500">
                        {dateGroup}
                      </p>
                      <div className="space-y-0.5">
                        {convs.map((conv) => (
                          <div key={conv.id}>{renderConversationRow(conv)}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Bottom profile */}
            <div className="border-t border-black/[0.04] p-1.5 dark:border-white/[0.06]">
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
              <div className="relative group">
                <button
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="sidebar-icon-hover flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-text-primary dark:text-white">
                      {user?.displayName || user?.email?.split("@")[0] || "User"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-xs text-text-secondary/60 dark:text-gray-500">
                    {profileMenuOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Conversation controls */}
          <div className="shrink-0 border-b border-primary/10 bg-white/90 px-3 py-2 backdrop-blur-xl dark:border-white/[0.06] dark:bg-card-dark/90 sm:px-5">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">shield_lock</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-text-primary dark:text-white">Private conversation</p>
                  <p className="truncate text-[10px] text-text-secondary">
                    {activeConversation ? `${activeConversation.messageCount || messages.length} messages` : "Start when you are ready"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoiceReplies}
                  aria-pressed={voiceRepliesEnabled}
                  aria-label={voiceRepliesEnabled ? "Turn automatic spoken replies off" : "Turn automatic spoken replies on"}
                  title={
                    getSunbirdVoices(userLanguage).length
                      ? `${getSunbirdVoices(userLanguage)[0]?.label}; spoken replies ${voiceRepliesEnabled ? "on" : "off"}`
                      : `${SUPPORTED_LANGUAGES[userLanguage].name} spoken replies unavailable`
                  }
                  className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-colors ${
                    voiceRepliesEnabled
                      ? "border-primary/20 bg-primary/[0.08] text-primary"
                      : "border-transparent text-text-secondary hover:bg-primary/[0.05] hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {voiceRepliesEnabled ? "volume_up" : "volume_off"}
                  </span>
                  <span className="hidden sm:inline">Spoken replies</span>
                </button>
                <button
                  onClick={handleNewChat}
                  className="flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/15 bg-white px-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/[0.05] dark:bg-card-dark"
                  aria-label="Start a new conversation"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">add_comment</span>
                  <span className="hidden xs:inline">New chat</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Conversation with Sister"
              className="h-full overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,255,0.045),transparent_38%)]"
            >
              <div className="mx-auto max-w-4xl px-3 pb-8 pt-4 sm:px-6 sm:pt-7">
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

                {voicePlaybackError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">
                    <span className="material-symbols-outlined text-base" aria-hidden="true">volume_off</span>
                    <span className="flex-1">{voicePlaybackError}</span>
                    <button type="button" onClick={() => setVoicePlaybackError(null)} aria-label="Dismiss voice playback message">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                    </button>
                  </div>
                )}

                {agentActionStatuses.length > 0 && (
                  <div className="mb-4 animate-fade-in rounded-2xl border border-black/[0.05] bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
                      Care updates
                    </p>
                    <div className="space-y-1.5">
                      {agentActionStatuses.map((status) => {
                        const icon =
                          status.state === "done" ? "check_circle" :
                          status.state === "failed" ? "error" : "progress_activity";
                        const colorClass =
                          status.state === "done" ? "text-emerald-600 dark:text-emerald-400" :
                          status.state === "failed" ? "text-red-500 dark:text-red-400" :
                          "text-amber-500 dark:text-amber-400";
                        return (
                          <div key={status.key} className="flex items-center gap-2.5 text-xs">
                            <span className={`material-symbols-outlined text-sm ${colorClass}`}>{icon}</span>
                            <span className="text-text-primary dark:text-white">{status.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSessionCard && (
                  <div className="mb-4 animate-fade-in rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 dark:border-fuchsia-800 dark:bg-fuchsia-950/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">
                          {activeSessionCard.priority === "critical"
                            ? "Priority support"
                            : "Counselling session"}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                          {activeSessionCard.state === "active"
                            ? "Your session is live — a counsellor is with you."
                            : activeSessionCard.state === "matched"
                              ? "A counsellor has been found and is being notified."
                              : "You're in the queue for the next available counsellor."}
                        </p>
                      </div>
                      <Link
                        href={
                          activeSessionCard.state === "active"
                            ? `/sessions/${activeSessionCard.id}`
                            : "/sessions"
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-dark px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark/90"
                      >
                        <span className="material-symbols-outlined text-base">
                          forum
                        </span>
                        {activeSessionCard.state === "active"
                          ? "Open session"
                          : "View status"}
                      </Link>
                    </div>
                  </div>
                )}
                {counsellorProfile && (
                  <div className="mb-4 animate-fade-in rounded-2xl bg-primary p-5 text-white shadow-primary-sm">
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
                  <div className="mx-auto flex min-h-[48vh] w-full max-w-2xl flex-col items-center justify-center px-1 py-8 text-center animate-fade-in sm:px-4">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-primary/15 bg-white shadow-soft dark:bg-card-dark">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-primary-sm">
                        <span className="material-symbols-outlined text-2xl text-white">favorite</span>
                      </div>
                    </div>
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">A private space with Sister</p>
                    <h2 className="max-w-lg text-2xl font-black leading-tight text-text-primary dark:text-white sm:text-3xl">
                      {emptyStateContent.title}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-text-secondary dark:text-gray-400">
                      {emptyStateContent.subtitle}
                    </p>

                    {emptyStateContent.showIcebreakers && (
                      <div className="mt-7 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {icebreakers.map((icebreaker) => (
                          <button
                            key={icebreaker.text}
                            onClick={() => sendMessage(icebreaker.text)}
                            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-primary/10 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${icebreaker.tone}`}>
                              <span className="material-symbols-outlined text-lg">{icebreaker.icon}</span>
                            </div>
                            <span className="min-w-0"><span className="block text-[10px] font-extrabold uppercase tracking-wide text-primary">{icebreaker.label}</span><span className="mt-0.5 block text-sm font-semibold leading-snug text-text-primary dark:text-gray-200">{icebreaker.text}</span></span>
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
                          <div key={message.id} className="group flex items-start gap-2.5 animate-fade-in sm:gap-3">
                            <div className="sticky top-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-primary-sm">
                              <span className="material-symbols-outlined text-base text-white">favorite</span>
                            </div>
                            <div className="min-w-0 max-w-[calc(100%-2.875rem)] flex-1 sm:max-w-[85%]">
                              <div className="flex items-baseline gap-2.5">
                                <span className="text-xs font-extrabold text-primary dark:text-primary-light">
                                  Sister
                                </span>
                                <span className="text-[9px] text-text-secondary/40 dark:text-gray-600">
                                  {formatRelativeTime(message.timestamp)}
                                </span>
                              </div>
                              <div className="mt-1.5 rounded-[22px] rounded-tl-md border border-primary/[0.08] bg-white px-4 py-3.5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.06]">
                                <p className="whitespace-pre-wrap text-[15px] leading-7 text-text-primary dark:text-gray-100">
                                  <StreamedText
                                    text={message.text}
                                    animate={message.animate}
                                    onTick={() => { if (!showScrollButton) scrollToBottom(); }}
                                  />
                                </p>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void playMessageAudio(message)}
                                  disabled={preparingAudioId === message.id}
                                  aria-label={
                                    playingAudioId === message.id
                                      ? "Pause Sister's spoken response"
                                      : "Listen to Sister's response"
                                  }
                                  className="flex min-h-9 items-center gap-1.5 rounded-xl bg-primary/[0.07] px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 disabled:cursor-wait disabled:opacity-60 dark:bg-primary/20 dark:text-primary-light"
                                >
                                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                                    {preparingAudioId === message.id
                                      ? "progress_activity"
                                      : playingAudioId === message.id
                                        ? "pause_circle"
                                        : "volume_up"}
                                  </span>
                                  {preparingAudioId === message.id
                                    ? "Preparing voice"
                                    : playingAudioId === message.id
                                      ? "Pause"
                                      : "Listen"}
                                  {message.audio && message.audio.durationSeconds > 0 && (
                                    <span className="opacity-60" aria-hidden="true">
                                      {message.audio.durationSeconds.toFixed(0)}s
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyMessageText(message.id, message.text)}
                                  className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-primary/[0.05] hover:text-primary"
                                  aria-label="Copy Sister's response"
                                >
                                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{copiedMessageId === message.id ? "check" : "content_copy"}</span>
                                  {copiedMessageId === message.id ? "Copied" : "Copy"}
                                </button>
                              </div>

                              {message.language && message.language !== "eng" && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary dark:bg-primary/20 dark:text-primary-light">
                                    <span className="material-symbols-outlined text-[10px]">language</span>
                                    {SUPPORTED_LANGUAGES[message.language as SupportedLanguageCode]?.name || message.language}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // User message
                      return (
                        <div key={message.id} className="group flex justify-end animate-fade-in">
                          <div className="flex max-w-[88%] flex-col items-end sm:max-w-[74%]">
                            <div className="rounded-[22px] rounded-br-md bg-primary px-4 py-3 text-white shadow-primary-sm">
                              <p className="whitespace-pre-wrap text-[15px] leading-6">{message.text}</p>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 px-1">
                              <span className="text-[9px] text-text-secondary/40 dark:text-gray-600">
                                {formatRelativeTime(message.timestamp)}
                              </span>
                              <span className="material-symbols-outlined text-[9px] text-text-secondary/30 dark:text-gray-600">check</span>
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                      <span className="material-symbols-outlined text-sm text-white">spa</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-white/[0.06] dark:ring-white/[0.06]">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-text-secondary/70 dark:text-gray-400">Sister is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-gray-800"
                aria-label="Jump to the newest message"
              >
                <span className="material-symbols-outlined text-lg">arrow_downward</span>
              </button>
            )}
          </div>

          {/* Composer */}
          <div className="z-20 shrink-0 border-t border-primary/10 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/[0.08] dark:bg-card-dark/95">
            <div className="mx-auto max-w-4xl px-3 pt-2.5 sm:px-6 sm:py-3">
              <form onSubmit={handleSubmit} className="relative">
                <div className="overflow-hidden rounded-[24px] border border-primary/15 bg-white shadow-[0_10px_32px_rgba(72,32,72,0.09)] transition-all focus-within:border-primary/35 focus-within:shadow-[0_12px_38px_rgba(255,0,255,0.12)] dark:border-white/10 dark:bg-white/[0.05]">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isListening
                        ? `Listening… ${recordingSeconds}s`
                        : isTranscribing
                          ? "Turning your voice into text…"
                          : "Message Sister"
                    }
                    disabled={isTyping || isListening || isTranscribing}
                    rows={1}
                    aria-label="Message Sister"
                    className="max-h-[132px] min-h-12 w-full resize-none border-none bg-transparent px-4 pb-1 pt-3.5 text-base leading-6 text-text-primary placeholder:text-text-secondary/55 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-white sm:max-h-[180px]"
                  />
                  <div className="flex items-center justify-between gap-2 px-2 pb-2">
                    <div className="flex min-w-0 items-center gap-1 rounded-xl bg-primary/[0.045] pl-2 text-primary">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">language</span>
                    <select
                      value={userLanguage}
                      onChange={(e) => changeReplyLanguage(e.target.value as SupportedLanguageCode)}
                      title="Voice and reply language"
                      aria-label="Voice and reply language"
                      className="h-10 max-w-[8rem] cursor-pointer rounded-xl border-0 bg-transparent px-1.5 text-xs font-bold text-text-secondary focus:outline-none focus:ring-0 dark:text-gray-300 sm:max-w-[10rem]"
                    >
                      {CHAT_LANGUAGE_OPTIONS.map((code) => (
                        <option key={code} value={code}>{SUPPORTED_LANGUAGES[code].nativeName}</option>
                      ))}
                    </select>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {speechSupported && (
                        <button
                          type="button"
                          onClick={toggleVoiceInput}
                          disabled={isTyping || isTranscribing}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
                            isListening
                              ? "animate-pulse bg-red-500 text-white shadow-md"
                              : "text-text-secondary hover:bg-primary/[0.06] hover:text-primary dark:text-gray-400"
                          }`}
                          title={isListening ? "Stop recording" : isTranscribing ? "Transcribing voice" : "Speak instead of typing"}
                          aria-label={isListening ? "Stop recording" : isTranscribing ? "Transcribing voice" : "Speak instead of typing"}
                        >
                          <span className="material-symbols-outlined text-xl" aria-hidden="true">{isTranscribing ? "hourglass_top" : isListening ? "stop_circle" : "mic"}</span>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping || isOverLimit}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-primary-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Send message"
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">{isTyping ? "hourglass_top" : "arrow_upward"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {voiceTranscriptReady && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-text-secondary dark:bg-primary/10 dark:text-gray-300" role="status">
                  <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">fact_check</span>
                  <span>Review what Sister heard, edit anything needed, then send.</span>
                </div>
              )}

              <div className="mt-2 flex items-start justify-between gap-2 px-1">
                <p className="max-w-xl text-[9px] leading-4 text-text-secondary/70 dark:text-gray-400 sm:text-[10px]">
                  Sister is an AI companion, not an emergency service.{" "}
                  <Link href="/help" className="font-bold text-primary hover:underline">Urgent human help</Link>
                </p>
                <div className="flex items-center gap-3">
                  {inputValue.length > MAX_MESSAGE_LENGTH - 200 && (
                    <span className={`text-[10px] font-medium ${isOverLimit ? "text-red-500" : "text-text-secondary/50 dark:text-gray-500"}`}>
                      {inputValue.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  )}
                  <span className="hidden text-[9px] text-text-secondary/40 dark:text-gray-500 sm:inline">Enter to send</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 0, 255, 0.2); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 0, 255, 0.35); }
      `}</style>
    </div>
  );
}
