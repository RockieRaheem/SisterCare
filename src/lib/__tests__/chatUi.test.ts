import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const chat = readFileSync(path.join(process.cwd(), "src", "app", "chat", "page.tsx"), "utf8");
const bottomNav = readFileSync(path.join(process.cwd(), "src", "components", "layout", "BottomNav.tsx"), "utf8");

describe("member chat workspace", () => {
  it("owns the mobile viewport so the composer cannot sit behind global navigation", () => {
    expect(bottomNav).toContain('"/chat"');
    expect(chat).toContain("h-[100dvh]");
    expect(chat).not.toContain("h-[calc(100dvh-var(--bottom-nav-height)");
    expect(chat).toContain("fixed inset-y-0 left-0");
  });

  it("provides clear navigation without leaving the conversation stranded", () => {
    expect(chat).toContain("CHAT_WORKSPACE_NAVIGATION");
    expect(chat).toContain("Go to another SisterCare page");
    expect(chat).toContain("Open chat history and navigation");
    expect(chat).toContain("Private support");
    expect(chat.match(/CHAT_WORKSPACE_NAVIGATION\.map/g)).toHaveLength(1);
    expect(chat.match(/>SisterCare</g)).toHaveLength(1);
  });

  it("starts with human concerns instead of presenting itself as a menstrual chatbot", () => {
    expect(chat).toContain("What would you like to talk through?");
    expect(chat).toContain("I need to talk about something that hurt me");
    expect(chat).toContain("I'm struggling with a relationship");
    expect(chat).toContain("I have a private health question");
    expect(chat).not.toContain("How can I manage cramps naturally?");
  });

  it("keeps the mobile composer spacious, accessible and voice capable", () => {
    expect(chat).toContain('aria-label="Message Sister"');
    expect(chat).toContain('aria-label="Send message"');
    expect(chat).toContain("Speak instead of typing");
    expect(chat).toContain("min-h-12 w-full resize-none");
    expect(chat).toContain("text-base leading-6");
    expect(chat).toContain("max-w-4xl");
  });

  it("makes message controls available to touch and assistive technology", () => {
    expect(chat).toContain("Copy Sister's response");
    expect(chat).toContain("Jump to the newest message");
    expect(chat).toContain("sm:group-focus-within:opacity-100");
    expect(chat).toContain("More options for");
  });

  it("keeps legacy conversations visible when preview metadata is missing", () => {
    expect(chat).toContain("mergeConversationHistory");
    expect(chat).not.toContain("hasNoContent");
    expect(chat).not.toContain('title.includes("sample")');
  });
});
