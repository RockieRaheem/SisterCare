import { describe, expect, it } from "vitest";
import { sanitizeCounsellorSummary } from "../counsellorPrivacy";

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
});
