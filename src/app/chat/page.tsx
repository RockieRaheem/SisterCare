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
} from "@/lib/firestore";
import { ChatConversation } from "@/types";

interface Message {
  id: string;
  sender: "user" | "sister";
  text: string;
  timestamp: Date;
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

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  sender: "sister",
  text: "Hello! I'm Sister, your supportive companion here at SisterCare. 💜 I'm here to listen, answer your questions about menstrual health, and provide emotional support. How are you feeling today?",
  timestamp: new Date(),
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
      setError(null);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error creating new chat:", err);
      setError("Failed to create new chat. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }, [user]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setActionLoading(conversationId);
    try {
      setActiveConversationId(conversationId);
      const existingMessages = await getMessages(conversationId);

      if (existingMessages.length > 0) {
        setMessages(
          existingMessages.map((msg) => ({
            id: msg.id,
            sender: msg.sender === "user" ? "user" : "sister",
            text: msg.content,
            timestamp: msg.timestamp,
          })),
        );
      } else {
        setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
      }
      setError(null);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error loading conversation:", err);
      setError("Failed to load conversation. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Load all conversations for user
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const userConversations = await getUserConversations(user.uid);
      setConversations(userConversations);

      if (userConversations.length > 0) {
        await loadConversation(userConversations[0].id);
      } else {
        await handleNewChat();
      }
      setError(null);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Failed to load conversations. Please try again.");
      await handleNewChat();
    } finally {
      setLoading(false);
    }
  }, [user, loadConversation, handleNewChat]);

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
        await deleteConversation(conversationId);

        setConversations((prev) => {
          const remaining = prev.filter((c) => c.id !== conversationId);

          if (conversationId === activeConversationId) {
            if (remaining.length > 0) {
              loadConversation(remaining[0].id);
            } else {
              handleNewChat();
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
    [activeConversationId, loadConversation, handleNewChat],
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
        await updateConversationTitle(conversationId, editTitleValue.trim());
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
      if (!text.trim() || !user || !activeConversationId) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      setIsTyping(true);
      setError(null);

      try {
        await addMessage(activeConversationId, {
          conversationId: activeConversationId,
          sender: "user",
          content: text.trim(),
        });

        await updateConversationPreview(activeConversationId, text.trim());

        const currentConversation = conversationsRef.current.find(
          (c) => c.id === activeConversationId,
        );
        if (currentConversation?.title === "New Chat") {
          const newTitle = generateTitleFromMessage(text.trim());
          await updateConversationTitle(activeConversationId, newTitle);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId ? { ...c, title: newTitle } : c,
            ),
          );
        }

        const conversationHistory = messages.slice(-10).map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory,
          }),
        });

        const data = await response.json();

        if (response.ok && data.response) {
          const sisterMessage: Message = {
            id: `sister-${Date.now()}`,
            sender: "sister",
            text: data.response,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, sisterMessage]);

          await addMessage(activeConversationId, {
            conversationId: activeConversationId,
            sender: "ai",
            content: data.response,
          });

          await updateConversationPreview(activeConversationId, data.response);

          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    lastMessage: data.response.substring(0, 100),
                    updatedAt: new Date(),
                  }
                : c,
            ),
          );
        } else {
          throw new Error(data.error || "Failed to get response");
        }
      } catch (err) {
        console.error("Error sending message:", err);

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
    [user, activeConversationId, messages, generateTitleFromMessage],
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
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary dark:text-gray-400">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Main Header - Same as other pages */}
      <Header variant="app" />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
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
            bg-white dark:bg-card-dark 
            border-r border-border-light dark:border-border-dark 
            transition-all duration-300 ease-out
            ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
            w-80 lg:w-72
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-xl">
                    chat
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary dark:text-white text-sm">
                    Chat History
                  </h2>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {conversations.length} conversations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors lg:hidden"
              >
                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">
                  close
                </span>
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={handleNewChat}
                disabled={actionLoading === "new"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
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
            <div className="px-3 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm text-text-primary dark:text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
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
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all cursor-pointer ${
                                  actionLoading === conversation.id
                                    ? "opacity-50 cursor-wait"
                                    : ""
                                } ${
                                  activeConversationId === conversation.id
                                    ? "bg-primary/10 dark:bg-primary/20 border-l-4 border-primary"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
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
            <div className="p-3 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-white dark:bg-card-dark">
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
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-text-primary dark:text-white">
                  {conversations.find((c) => c.id === activeConversationId)
                    ?.title || "Chat with Sister"}
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

          {/* Error Toast */}
          {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in text-sm">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="p-1 hover:bg-white/20 rounded-lg"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-background-dark">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 animate-fade-in ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                      message.sender === "sister"
                        ? "bg-gradient-to-br from-primary to-purple-600"
                        : "bg-gradient-to-br from-orange-400 to-pink-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-white text-lg">
                      {message.sender === "sister" ? "spa" : "person"}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`flex-1 max-w-[80%] ${message.sender === "user" ? "flex flex-col items-end" : ""}`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.sender === "sister"
                          ? "bg-white dark:bg-card-dark rounded-tl-md"
                          : "bg-gradient-to-r from-primary to-purple-600 text-white rounded-tr-md"
                      }`}
                    >
                      <p
                        className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          message.sender === "sister"
                            ? "text-text-primary dark:text-gray-200"
                            : "text-white"
                        }`}
                      >
                        {message.text}
                      </p>
                    </div>
                    <p className="text-[10px] text-text-secondary dark:text-gray-500 mt-1 px-1">
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
                <div className="flex gap-4 animate-fade-in">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-white text-lg">
                      spa
                    </span>
                  </div>
                  <div className="bg-white dark:bg-card-dark rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border-light dark:border-border-dark bg-white dark:bg-card-dark">
            <div className="max-w-3xl mx-auto px-4 py-4">
              {/* Icebreakers for new chats */}
              {messages.length <= 1 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {icebreakers.map((icebreaker) => (
                    <button
                      key={icebreaker.text}
                      onClick={() => sendMessage(icebreaker.text)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-primary hover:shadow-md transition-all text-left group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${icebreaker.color} flex items-center justify-center shrink-0`}
                      >
                        <span className="material-symbols-outlined text-white text-lg">
                          {icebreaker.icon}
                        </span>
                      </div>
                      <span className="text-sm text-text-primary dark:text-gray-300 leading-tight">
                        {icebreaker.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl p-2 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-900 transition-all">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Sister..."
                    disabled={isTyping}
                    rows={1}
                    className="flex-1 bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-text-primary dark:text-white placeholder:text-text-secondary text-sm px-3 py-2 max-h-[150px]"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="p-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                  >
                    <span className="material-symbols-outlined text-lg">
                      send
                    </span>
                  </button>
                </div>
              </form>

              <p className="text-center text-[10px] text-text-secondary dark:text-gray-500 mt-3">
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
