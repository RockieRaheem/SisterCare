import { describe, expect, it } from "vitest";
import {
  SISTERCARE_AGENT_CAPABILITY_MAP,
  SISTERCARE_PRODUCT_SCOPE,
} from "../agent/systemCapabilities";

describe("agent product scope", () => {
  it("centres private menstrual, emotional and human support", () => {
    expect(SISTERCARE_PRODUCT_SCOPE).toContain(
      "private, non-judgmental first place",
    );
    expect(SISTERCARE_PRODUCT_SCOPE).toContain("emotional wellbeing");
    expect(SISTERCARE_PRODUCT_SCOPE).toContain("verified human support");
  });

  it("keeps pregnancy support bounded without removing safe compatibility", () => {
    expect(SISTERCARE_PRODUCT_SCOPE).toContain(
      "Pregnancy questions remain supported",
    );
    expect(SISTERCARE_PRODUCT_SCOPE).toContain(
      "Do not turn an unrelated conversation",
    );
    expect(SISTERCARE_AGENT_CAPABILITY_MAP).toContain(
      "reported pregnancy or birth state",
    );
  });

  it("prohibits demeaning age language", () => {
    expect(SISTERCARE_PRODUCT_SCOPE).toMatch(
      /Never shame,\s+patronize or call an adult member a girl/,
    );
  });
});
