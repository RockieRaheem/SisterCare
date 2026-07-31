import { describe, expect, it } from "vitest";
import { parseWellbeingCheckIn } from "../wellbeing";

describe("wellbeing check-ins", () => {
  it("accepts four bounded scores and normalizes the note", () => {
    expect(
      parseWellbeingCheckIn({
        mood: 2,
        stress: 5,
        sleep: 3,
        energy: 1,
        note: "  I   need a quiet day. ",
      }),
    ).toEqual({
      mood: 2,
      stress: 5,
      sleep: 3,
      energy: 1,
      note: "I need a quiet day.",
    });
  });

  it("rejects missing, fractional, and out-of-range scores", () => {
    expect(parseWellbeingCheckIn({ mood: 0, stress: 2, sleep: 3, energy: 4 })).toBeNull();
    expect(parseWellbeingCheckIn({ mood: 2.5, stress: 2, sleep: 3, energy: 4 })).toBeNull();
    expect(parseWellbeingCheckIn({ mood: 2, stress: 2, sleep: 3 })).toBeNull();
  });
});
