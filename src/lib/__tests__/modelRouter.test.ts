import { describe, expect, it } from "vitest";
import {
  buildAgentModelPlan,
  hasConfiguredAgentProvider,
} from "@/lib/agent/modelRouter";

describe("agent model router", () => {
  it("returns no attempts without a configured provider", () => {
    expect(buildAgentModelPlan({})).toEqual([]);
    expect(hasConfiguredAgentProvider({})).toBe(false);
  });

  it("builds Gemini fallback models when only Gemini is configured", () => {
    const plan = buildAgentModelPlan({ GEMINI_API_KEY: "gemini-key" });
    expect(plan.map(({ provider, model }) => ({ provider, model }))).toEqual([
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "gemini", model: "gemini-2.5-pro" },
      { provider: "gemini", model: "gemini-2.0-flash" },
    ]);
  });

  it("supports a configurable model through the Groq API", () => {
    expect(
      buildAgentModelPlan({
        GROQ_API_KEY: "groq-key",
        GROQ_MODEL: "llama-custom",
      }),
    ).toEqual([
      { provider: "groq", model: "llama-custom", apiKey: "groq-key" },
    ]);
  });

  it("respects explicit provider order and removes duplicates", () => {
    const plan = buildAgentModelPlan({
      GEMINI_API_KEY: "gemini-key",
      GROQ_API_KEY: "groq-key",
      AGENT_PROVIDER_ORDER: "groq,gemini,groq",
    });
    expect(plan[0].provider).toBe("groq");
    expect(plan.slice(1).every(({ provider }) => provider === "gemini")).toBe(
      true,
    );
    expect(hasConfiguredAgentProvider({ GROQ_API_KEY: "groq-key" })).toBe(true);
  });
});
