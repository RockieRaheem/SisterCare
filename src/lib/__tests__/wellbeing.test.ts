import { describe, expect, it } from "vitest";
import {
  localWellbeingDate,
  normalizeWellbeingDate,
  parseWellbeingCheckIn,
} from "../wellbeing";

describe("wellbeing check-ins", () => {
  it("migrates a complete legacy scale into a word without keeping scores", () => {
    expect(
      parseWellbeingCheckIn({
        mood: 2,
        stress: 5,
        sleep: 3,
        energy: 1,
        note: "  I   need a quiet day. ",
      }),
    ).toEqual({
      feelings: ["overwhelmed"],
      note: "I need a quiet day.",
    });
  });

  it("rejects incomplete, fractional, and out-of-range legacy scales", () => {
    expect(parseWellbeingCheckIn({ mood: 0, stress: 2, sleep: 3, energy: 4 })).toBeNull();
    expect(parseWellbeingCheckIn({ mood: 2.5, stress: 2, sleep: 3, energy: 4 })).toBeNull();
    expect(parseWellbeingCheckIn({ mood: 2, stress: 2, sleep: 3 })).toBeNull();
  });

  it("accepts one emotional pulse without requiring four scales", () => {
    expect(
      parseWellbeingCheckIn({
        localDate: "2026-08-13",
        feelings: ["anxious"],
      }),
    ).toEqual({
      localDate: "2026-08-13",
      feelings: ["anxious"],
    });
  });

  it("keeps bounded emotional context without accepting arbitrary labels", () => {
    expect(
      parseWellbeingCheckIn({
        mood: 2,
        stress: 4,
        sleep: 3,
        energy: 2,
        localDate: "2026-08-12",
        feelings: ["anxious", "sad", "anxious", "invented", "lonely", "angry"],
        contexts: ["relationships", "grief_or_loss", "unknown"],
        supportNeed: "talk_to_someone",
      }),
    ).toMatchObject({
      localDate: "2026-08-12",
      feelings: ["anxious", "sad", "lonely"],
      contexts: ["relationships", "grief_or_loss"],
      supportNeed: "talk_to_someone",
    });
  });

  it("uses one plausible local calendar day for daily updates", () => {
    const now = new Date("2026-08-12T22:30:00.000Z");
    expect(normalizeWellbeingDate("2026-08-13", now)).toBe("2026-08-13");
    expect(normalizeWellbeingDate("2024-01-01", now)).toBe(localWellbeingDate(now));
    expect(normalizeWellbeingDate("not-a-date", now)).toBe(localWellbeingDate(now));
  });

  it("keeps only valid timestamps for an explicitly requested follow-up", () => {
    expect(
      parseWellbeingCheckIn({
        feelings: ["sad"],
        followUpAt: "2026-08-21T09:30:00+03:00",
        followUpDeliveredAt: "not-a-date",
      }),
    ).toMatchObject({
      feelings: ["sad"],
      followUpAt: "2026-08-21T06:30:00.000Z",
    });
  });
});
