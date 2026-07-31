import { describe, expect, it } from "vitest";
import {
  resolveCounsellorContext,
  sanitizeCounsellorSummary,
} from "../counsellorPrivacy";

describe("counsellor handoff privacy", () => {
  it("removes contact details from a handoff summary", () => {
    const result = sanitizeCounsellorSummary(
      "Email me at member@example.com or call +256 700 123 456 about cramps.",
    );

    expect(result).toBe(
      "Email me at [private email] or call [private number] about cramps.",
    );
  });

  it("removes introduced and known member names", () => {
    expect(
      sanitizeCounsellorSummary(
        "My name is Jane N. Please help Jane Nakato with anxiety.",
        ["Jane Nakato", "jane@example.com"],
      ),
    ).toBe("the member. Please help the member with anxiety.");
  });

  it("uses neutral language and limits summary length", () => {
    expect(sanitizeCounsellorSummary(null)).toBe(
      "Member requested a counselling session",
    );
    expect(sanitizeCounsellorSummary("x".repeat(900))).toHaveLength(500);
  });

  it("does not share context when per-session consent is absent", () => {
    expect(
      resolveCounsellorContext({
        policy: "ask_each_time",
        reason: "user_request",
        requestedSummary: "I discussed anxiety and my phone is +256700123456",
      }),
    ).toEqual({
      summary:
        "Member requested a counselling session without sharing chat context.",
      scope: "none",
      includeConversationReference: false,
    });
  });

  it("shares only a sanitized summary after member approval", () => {
    expect(
      resolveCounsellorContext({
        policy: "ask_each_time",
        explicitSummaryConsent: true,
        reason: "user_request",
        requestedSummary: "My name is Jane. Call +256700123456 about anxiety.",
      }),
    ).toEqual({
      summary: "the member. Call [private number] about anxiety.",
      scope: "member_approved",
      includeConversationReference: false,
    });
  });

  it("limits critical handoffs to minimum safety context", () => {
    expect(
      resolveCounsellorContext({
        policy: "never",
        reason: "risk_detected",
        requestedSummary: "Sensitive crisis transcript",
      }),
    ).toEqual({
      summary:
        "Urgent safety support requested after SisterCare detected a critical risk signal.",
      scope: "safety_minimum",
      includeConversationReference: false,
    });
  });
});
