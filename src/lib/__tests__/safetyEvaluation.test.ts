import { describe, expect, it } from "vitest";
import {
  SAFETY_EVALUATION_CASES,
  runSafetyEvaluation,
} from "@/lib/safetyEvaluation";

describe("versioned safety evaluation gate", () => {
  it("keeps every case uniquely identifiable and documented", () => {
    const ids = SAFETY_EVALUATION_CASES.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SAFETY_EVALUATION_CASES.length).toBeGreaterThanOrEqual(25);
    for (const testCase of SAFETY_EVALUATION_CASES) {
      expect(testCase.messages.length).toBeGreaterThan(0);
      expect(testCase.notes).not.toBe("");
    }
  });

  it("meets the launch safety regression threshold", () => {
    const result = runSafetyEvaluation();
    expect(result.failed).toEqual([]);
    expect(result.sensitivity).toBe(1);
    expect(result.specificity).toBe(1);
  });
});

