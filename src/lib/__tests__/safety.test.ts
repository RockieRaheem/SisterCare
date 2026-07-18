import { describe, it, expect } from "vitest";
import {
  checkForCrisis,
  assessTriageSeverity,
  CRISIS_RESPONSES,
} from "../safety";

describe("checkForCrisis — self-harm (highest priority)", () => {
  it.each([
    "I want to kill myself",
    "i wanna die",
    "I've been thinking about suicide",
    "kms",
    "I can't take it anymore",
    "no reason to live",
  ])("detects %j", (message) => {
    expect(checkForCrisis(message)).toBe(CRISIS_RESPONSES.selfHarm);
  });

  it("detects native-language phrases even without translation", () => {
    expect(checkForCrisis("njagala kufa")).toBe(CRISIS_RESPONSES.selfHarm);
    expect(checkForCrisis("nataka kufa")).toBe(CRISIS_RESPONSES.selfHarm);
    expect(checkForCrisis("okwetta")).toBe(CRISIS_RESPONSES.selfHarm);
    expect(checkForCrisis("kujiua")).toBe(CRISIS_RESPONSES.selfHarm);
  });

  it("every self-harm response includes Uganda emergency contacts", () => {
    expect(CRISIS_RESPONSES.selfHarm).toContain("116");
    expect(CRISIS_RESPONSES.selfHarm).toContain("Butabika");
  });
});

describe("checkForCrisis — abuse and danger", () => {
  it("family abuse needs both an abuse term and a person term", () => {
    expect(checkForCrisis("my father beats me")).toBe(
      CRISIS_RESPONSES.familyAbuse,
    );
    expect(checkForCrisis("my boyfriend hits me")).toBe(
      CRISIS_RESPONSES.familyAbuse,
    );
  });

  it("abuse without a named person falls back to the general response", () => {
    expect(checkForCrisis("someone hits me")).toBe(
      CRISIS_RESPONSES.generalAbuse,
    );
  });

  it("detects violence toward others", () => {
    expect(checkForCrisis("I want to pour acid on them")).toBe(
      CRISIS_RESPONSES.violence,
    );
  });

  it("detects harassment and stalking", () => {
    expect(checkForCrisis("a stalker keeps following me")).toBe(
      CRISIS_RESPONSES.harassment,
    );
  });

  it("detects danger statements", () => {
    expect(checkForCrisis("I am not safe at home right now")).toBe(
      CRISIS_RESPONSES.danger,
    );
  });
});

describe("checkForCrisis — must NOT trigger on everyday messages", () => {
  it.each([
    "hello sister",
    "what is ovulation?",
    "I have cramps today",
    "my period is late",
    "when is my fertile window?",
    "I feel a bit sad today",
  ])("returns null for %j", (message) => {
    expect(checkForCrisis(message)).toBeNull();
  });
});

describe("assessTriageSeverity", () => {
  it("flags self-harm as critical, including native phrases", () => {
    expect(assessTriageSeverity("i want to die").severity).toBe("critical");
    expect(assessTriageSeverity("njagala kufa").severity).toBe("critical");
    expect(assessTriageSeverity("kujiua").severity).toBe("critical");
  });

  it("flags distress as high", () => {
    expect(assessTriageSeverity("I feel completely overwhelmed").severity).toBe(
      "high",
    );
  });

  it("flags wellbeing concerns as medium", () => {
    expect(assessTriageSeverity("I'm anxious about my exams").severity).toBe(
      "medium",
    );
  });

  it("treats routine questions as low", () => {
    expect(assessTriageSeverity("how long is a normal cycle?").severity).toBe(
      "low",
    );
  });
});
