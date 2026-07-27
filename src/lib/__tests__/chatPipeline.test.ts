import { describe, expect, it } from "vitest";
import {
  ChatPipelineError,
  evaluateHandoffPolicy,
  inferCounsellorSpecialty,
  MAX_HISTORY_MESSAGES,
  runChatPreflightPipeline,
} from "@/lib/chatPipeline";

describe("typed chat preflight pipeline", () => {
  it("uses verified identity instead of a client-claimed uid", () => {
    const result = runChatPreflightPipeline(
      { message: "Hello", userId: "spoofed-user" },
      { mode: "verified", uid: "verified-user" },
    );
    expect(result.request.userId).toBe("verified-user");
    expect(result.trace.map((entry) => entry.stage)).toEqual([
      "identity",
      "validation",
      "context",
      "safety",
    ]);
  });

  it("normalizes and bounds conversation context", () => {
    const history = Array.from({ length: 50 }, (_, index) => ({
      role: index % 2 ? "assistant" : "user",
      content: `message-${index}`,
    }));
    const result = runChatPreflightPipeline(
      { message: "Hello", userId: "dev-user", conversationHistory: history },
      { mode: "development", bodyUid: "dev-user" },
    );
    expect(result.request.conversationHistory).toHaveLength(
      MAX_HISTORY_MESSAGES,
    );
    expect(result.request.conversationHistory[0].content).toBe("message-20");
  });

  it("short-circuits cumulative crisis signals before reasoning", () => {
    const result = runChatPreflightPipeline(
      {
        message: "I won't be here tomorrow",
        conversationHistory: [
          { role: "user", content: "Nothing matters anymore" },
          { role: "assistant", content: "I am listening" },
          { role: "user", content: "I gave my things away" },
        ],
      },
      { mode: "verified", uid: "user-1" },
    );
    expect(result.safety.crisisType).toBe("selfHarm");
    expect(result.safety.severity).toBe("critical");
    expect(result.trace.at(-1)?.outcome).toBe("short_circuit");
  });

  it.each([
    [{}, "message_required"],
    [{ message: "x".repeat(2001) }, "message_too_long"],
  ])("returns typed validation errors", (payload, code) => {
    expect(() =>
      runChatPreflightPipeline(payload, {
        mode: "verified",
        uid: "user-1",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ChatPipelineError>>({ code }),
    );
  });
});

describe("handoff policy stage", () => {
  it("auto-connects explicit and critical requests", () => {
    expect(
      evaluateHandoffPolicy({
        message: "I need to talk to a counsellor",
        severity: "low",
      }).shouldAutoConnect,
    ).toBe(true);
    expect(
      evaluateHandoffPolicy({
        message: "Please help",
        severity: "critical",
      }).shouldAutoConnect,
    ).toBe(true);
  });

  it("offers rather than forces handoff for high distress", () => {
    const policy = evaluateHandoffPolicy({
      message: "I feel overwhelmed",
      severity: "high",
    });
    expect(policy.shouldOfferHandoff).toBe(true);
    expect(policy.shouldAutoConnect).toBe(false);
  });

  it("infers the relevant professional specialty", () => {
    expect(inferCounsellorSpecialty("I need postpartum support")).toBe(
      "Pregnancy & Postpartum",
    );
    expect(inferCounsellorSpecialty("My period cramps are severe")).toBe(
      "Menstrual Health",
    );
  });
});

