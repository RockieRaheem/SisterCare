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

  it("supports a configurable Grok model through the xAI API", () => {
    expect(
      buildAgentModelPlan({
        XAI_API_KEY: "xai-key",
        XAI_MODEL: "grok-custom",
      }),
    ).toEqual([
      { provider: "xai", model: "grok-custom", apiKey: "xai-key" },
    ]);
  });

  it("respects explicit provider order and removes duplicates", () => {
    const plan = buildAgentModelPlan({
      GEMINI_API_KEY: "gemini-key",
      XAI_API_KEY: "xai-key",
      AGENT_PROVIDER_ORDER: "xai,gemini,xai",
    });
    expect(plan[0].provider).toBe("xai");
    expect(plan.slice(1).every(({ provider }) => provider === "gemini")).toBe(
      true,
    );
    expect(hasConfiguredAgentProvider({ XAI_API_KEY: "xai-key" })).toBe(true);
  });
});
