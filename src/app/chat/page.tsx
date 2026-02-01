"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";

interface Message {
  id: number;
  sender: "user" | "sister";
  text: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: 1,
    sender: "sister",
    text: "Hello! I'm here to listen and support you. How are you feeling today?",
    timestamp: new Date(),
  },
  {
    id: 2,
    sender: "user",
    text: "I'm feeling a bit anxious about my upcoming cycle.",
    timestamp: new Date(),
  },
  {
    id: 3,
    sender: "sister",
    text: "It's completely normal to feel that way. We can talk through it or I can suggest some relaxation techniques. What would help most right now?",
    timestamp: new Date(),
  },
];

const icebreakers = [
  "How can I manage cramps naturally?",
  "I'm feeling a bit anxious",
  "Tips for better sleep",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand how you're feeling. Remember, it's okay to take things one step at a time. Would you like some specific tips for managing this?",
        "Thank you for sharing that with me. Your feelings are valid. Let's explore some ways to help you feel better.",
        "I hear you. Many sisters experience similar feelings. Here are some gentle suggestions that might help...",
        "That's a great question! Let me share some helpful information about that topic.",
      ];

      const sisterMessage: Message = {
        id: messages.length + 2,
        sender: "sister",
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, sisterMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="app" />

      <main className="flex flex-1 justify-center py-6">
        <div className="flex flex-col max-w-[800px] w-full px-4 h-[calc(100vh-140px)]">
          {/* Section Header */}
          <div className="flex items-center gap-3 px-4 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">
                chat_bubble
              </span>
            </div>
            <div>
              <h2 className="text-text-primary dark:text-white text-[22px] font-bold leading-tight tracking-tight">
                Chat with Sister
              </h2>
              <p className="text-xs text-primary/70 font-medium">
                Online • Your safe space for guidance
              </p>
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 overflow-y-auto space-y-2 px-2 custom-scrollbar">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-3 p-4 ${message.sender === "user" ? "justify-end" : ""}`}
              >
                {message.sender === "sister" && (
                  <div className="bg-gradient-to-br from-primary to-purple-600 rounded-full w-10 h-10 shrink-0 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-lg">
                      spa
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-1 flex-col gap-1 ${message.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <p
                    className={`text-[13px] font-bold leading-normal ${message.sender === "sister" ? "text-primary ml-1" : "text-primary/70 mr-1"}`}
                  >
                    {message.sender === "sister" ? "Sister" : "You"}
                  </p>
                  <p
                    className={`text-base font-normal leading-relaxed flex max-w-[80%] px-4 py-3 shadow-sm ${
                      message.sender === "sister"
                        ? "rounded-xl rounded-bl-none bg-primary text-white"
                        : "rounded-xl rounded-br-none bg-user-bubble text-[#5a3a22]"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
                {message.sender === "user" && (
                  <div className="bg-gradient-to-br from-orange-300 to-pink-300 rounded-full w-10 h-10 shrink-0 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-lg">
                      person
                    </span>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-end gap-3 p-4">
                <div className="bg-gradient-to-br from-primary to-purple-600 rounded-full w-10 h-10 shrink-0 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-lg">spa</span>
                </div>
                <div className="flex flex-1 flex-col gap-1 items-start">
                  <p className="text-primary text-[13px] font-bold leading-normal ml-1">
                    Sister
                  </p>
                  <div className="rounded-xl rounded-bl-none bg-primary text-white px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area & Icebreakers */}
          <div className="mt-auto p-4 space-y-4">
            {/* Icebreakers */}
            <div className="flex flex-wrap gap-2 justify-center">
              {icebreakers.map((icebreaker) => (
                <button
                  key={icebreaker}
                  onClick={() => sendMessage(icebreaker)}
                  className="px-4 py-2 rounded-full border border-primary/30 bg-white dark:bg-background-dark text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all"
                >
                  {icebreaker}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center gap-2 bg-white dark:bg-background-dark p-2 rounded-xl border border-primary/10 shadow-lg shadow-primary/5"
            >
              <button
                type="button"
                className="p-2 text-primary/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">
                  sentiment_satisfied
                </span>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary dark:text-white placeholder:text-gray-400 text-sm"
                placeholder="Type your message here..."
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
            <p className="text-center text-[10px] text-gray-400">
              Sister is an AI designed for support. For medical emergencies,
              please consult a healthcare professional.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
