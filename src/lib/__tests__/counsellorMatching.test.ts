import { describe, it, expect } from "vitest";
import {
  evaluateTimeAvailability,
  calculateCounsellorScore,
  rankCounsellors,
  selectCandidates,
} from "../counsellorMatching";
import { Counsellor } from "@/types";

const makeCounsellor = (overrides: Partial<Counsellor> = {}): Counsellor => ({
  id: "c1",
  name: "Test Counsellor",
  title: "Counsellor",
  bio: "",
  specializations: ["Mental Health"],
  photoURL: "",
  status: "available",
  rating: 4.5,
  reviewCount: 10,
  yearsExperience: 5,
  languages: ["English"],
  phoneNumber: "+256700000000",
  whatsappNumber: "+256700000000",
  availableHours: {
    start: "08:00",
    end: "18:00",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  },
  sessionCount: 100,
  verified: true,
  createdAt: new Date("2023-01-01"),
  ...overrides,
});

// 2026-07-14 is a Tuesday
const tuesdayAt = (time: string) => new Date(`2026-07-14T${time}:00`);
// 2026-07-12 is a Sunday
const sundayAt = (time: string) => new Date(`2026-07-12T${time}:00`);

describe("evaluateTimeAvailability", () => {
  const counsellor = makeCounsellor();

  it("is available during scheduled weekday hours", () => {
    const result = evaluateTimeAvailability(counsellor, tuesdayAt("10:00"));
    expect(result.isAvailableNow).toBe(true);
  });

  it("is unavailable after hours and points to the next day", () => {
    const result = evaluateTimeAvailability(counsellor, tuesdayAt("19:00"));
    expect(result.isAvailableNow).toBe(false);
    expect(result.nextAvailableTime).toBe("Wednesday at 08:00");
  });

  it("before opening hours it points to today", () => {
    const result = evaluateTimeAvailability(counsellor, tuesdayAt("07:30"));
    expect(result.isAvailableNow).toBe(false);
    expect(result.nextAvailableTime).toBe("Today at 08:00");
  });

  it("on an unscheduled day it points to the next scheduled day", () => {
    const result = evaluateTimeAvailability(counsellor, sundayAt("10:00"));
    expect(result.isAvailableNow).toBe(false);
    expect(result.nextAvailableTime).toBe("Monday at 08:00");
  });

  it("end time is exclusive", () => {
    const result = evaluateTimeAvailability(counsellor, tuesdayAt("18:00"));
    expect(result.isAvailableNow).toBe(false);
  });
});

describe("calculateCounsellorScore", () => {
  const available = { isAvailableNow: true, nextAvailableTime: null };
  const unavailable = {
    isAvailableNow: false,
    nextAvailableTime: "Today at 08:00",
  };

  it("rewards exact language and specialty match while available", () => {
    const c = makeCounsellor({ languages: ["English", "Luganda"] });
    const score = calculateCounsellorScore(
      c,
      { specialty: "Mental Health", preferredLanguage: "Luganda" },
      available,
      0,
    );
    // 35 (available) + 30 (language) + 20 (specialty) + 10 (no load) + 4.5
    expect(score).toBe(99.5);
  });

  it("penalizes overload and being outside hours", () => {
    const c = makeCounsellor();
    const busy = calculateCounsellorScore(c, {}, unavailable, 6);
    const free = calculateCounsellorScore(c, {}, available, 0);
    expect(busy).toBeLessThan(free);
  });

  it("gives partial credit for related specialties", () => {
    const related = makeCounsellor({
      specializations: ["Reproductive Health"],
    });
    const unrelated = makeCounsellor({
      specializations: ["Relationship Counselling"],
    });
    const relatedScore = calculateCounsellorScore(
      related,
      { specialty: "Menstrual Health" },
      available,
      0,
    );
    const unrelatedScore = calculateCounsellorScore(
      unrelated,
      { specialty: "Menstrual Health" },
      available,
      0,
    );
    expect(relatedScore).toBeGreaterThan(unrelatedScore);
  });
});

describe("rankCounsellors", () => {
  it("prefers the language-matching counsellor, all else equal", () => {
    const english = makeCounsellor({ id: "en", languages: ["English"] });
    const luganda = makeCounsellor({ id: "lug", languages: ["Luganda"] });
    const best = rankCounsellors(
      [english, luganda],
      { preferredLanguage: "Luganda" },
      new Map(),
      tuesdayAt("10:00"),
    );
    expect(best?.id).toBe("lug");
  });

  it("uses load balancing to break ties", () => {
    const loaded = makeCounsellor({ id: "loaded" });
    const idle = makeCounsellor({ id: "idle" });
    const best = rankCounsellors(
      [loaded, idle],
      {},
      new Map([["loaded", 3]]),
      tuesdayAt("10:00"),
    );
    expect(best?.id).toBe("idle");
  });

  it("returns null for an empty candidate list", () => {
    expect(rankCounsellors([], {}, new Map())).toBeNull();
  });
});

describe("selectCandidates", () => {
  it("never invents a counsellor when the live list is empty", () => {
    const candidates = selectCandidates([], {});
    expect(candidates).toEqual([]);
  });

  it("returns no candidates when an empty live list is filtered by specialty", () => {
    const candidates = selectCandidates([], { specialty: "Mental Health" });
    expect(candidates).toEqual([]);
  });

  it("keeps live counsellors when no exact language match exists", () => {
    const fetched = [makeCounsellor({ languages: ["English"] })];
    const candidates = selectCandidates(fetched, {
      preferredLanguage: "Ateso",
    });
    expect(candidates).toEqual(fetched);
  });

  it("keeps the fetched list when it already covers the language", () => {
    const fetched = [makeCounsellor({ id: "live", languages: ["Luganda"] })];
    const candidates = selectCandidates(fetched, {
      preferredLanguage: "Luganda",
    });
    expect(candidates).toEqual(fetched);
  });
});
