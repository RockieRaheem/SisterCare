import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emitEvent: vi.fn(),
  updateAgentManagedProfile: vi.fn(),
}));

vi.mock("../server/serverData", () => ({
  clearPregnancyData: vi.fn(),
  createReminder: vi.fn(),
  getAgentSystemOverview: vi.fn(),
  getSymptoms: vi.fn(),
  logSymptoms: vi.fn(),
  saveCycleData: vi.fn(),
  savePregnancyData: vi.fn(),
  updateAgentManagedProfile: mocks.updateAgentManagedProfile,
  updateCycleAfterBirth: vi.fn(),
}));

vi.mock("../server/sessions", () => ({
  createSessionRequest: vi.fn(),
}));

vi.mock("../server/events", () => ({
  emitEvent: mocks.emitEvent,
}));

vi.mock("../server/reviewedKnowledge", () => ({
  searchReviewedKnowledge: vi.fn().mockResolvedValue([]),
}));

import { executeAgent } from "../agent/executor";

const context = (userId: string, clinicalGuidanceAllowed = true) => ({
  userId,
  userProfile: { displayName: "Amina", onboardingCompleted: true },
  conversationHistory: [
    { role: "user", content: "My preferred name is Amina" },
    { role: "assistant", content: "I will remember that." },
  ],
  clinicalGuidanceAllowed,
});

function groqResponse(message: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      choices: [{ finish_reason: "stop", message }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("agent provider and tool loop", () => {
  beforeEach(() => {
    mocks.emitEvent.mockReset();
    mocks.emitEvent.mockResolvedValue(undefined);
    mocks.updateAgentManagedProfile.mockReset();
    mocks.updateAgentManagedProfile.mockResolvedValue(undefined);
    vi.stubEnv("AGENT_PROVIDER_ORDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "groq-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends durable conversation memory and enforces the clinical tool gate", async () => {
    const fetch = vi.fn().mockResolvedValue(
      groqResponse({
        role: "assistant",
        content: "I remember your preferred name is Amina.",
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const result = await executeAgent(
      "",
      "What name did I share?",
      context("member-memory", false),
    );

    expect(result.response).toBe("I remember your preferred name is Amina.");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    const request = JSON.parse(String(init.body)) as {
      messages: Array<{ role: string; content: string }>;
      tools: Array<{ function: { name: string } }>;
    };
    expect(request.messages).toEqual(
      expect.arrayContaining([
        { role: "user", content: "My preferred name is Amina" },
        { role: "assistant", content: "I will remember that." },
        { role: "user", content: "What name did I share?" },
      ]),
    );
    expect(request.tools.map((tool) => tool.function.name)).not.toContain(
      "analyze_symptoms",
    );
    expect(request.tools.map((tool) => tool.function.name)).toContain(
      "update_period_start",
    );
  });

  it("binds model-selected writes to the verified caller", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        groqResponse({
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "tool-1",
              type: "function",
              function: {
                name: "update_user_profile",
                arguments: JSON.stringify({
                  userId: "another-user",
                  displayName: "Amina K",
                }),
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        groqResponse({
          role: "assistant",
          content: "Your preferred name is now Amina K.",
        }),
      );
    vi.stubGlobal("fetch", fetch);

    const result = await executeAgent(
      "",
      "Change my name to Amina K",
      context("verified-member"),
    );

    expect(mocks.updateAgentManagedProfile).toHaveBeenCalledWith(
      "verified-member",
      expect.objectContaining({ displayName: "Amina K" }),
    );
    expect(mocks.updateAgentManagedProfile).not.toHaveBeenCalledWith(
      "another-user",
      expect.anything(),
    );
    expect(result.toolsUsed).toEqual(["update_user_profile"]);
    expect(result.actions).toEqual(["Updated profile preferences"]);
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      "agent.tool_executed",
      expect.objectContaining({
        userId: "verified-member",
        toolName: "update_user_profile",
        success: true,
      }),
    );
  });
});
