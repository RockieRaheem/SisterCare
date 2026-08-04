import { describe, expect, it } from "vitest";
import {
  describeCounsellorEligibilityFailure,
  evaluateCounsellorEligibility,
  evaluateCounsellorStanding,
  evaluateCrisisEscalation,
  isCounsellorOnShift,
} from "@/lib/counsellorOperations";
import { Counsellor } from "@/types";

const now = new Date("2026-07-27T09:00:00.000Z"); // 12:00 Kampala

function counsellor(overrides: Partial<Counsellor> = {}): Counsellor {
  return {
    id: "c-1",
    name: "Test Counsellor",
    title: "Counsellor",
    bio: "",
    specializations: ["Mental Health"],
    photoURL: "",
    status: "available",
    rating: 4.8,
    reviewCount: 20,
    yearsExperience: 5,
    languages: ["English"],
    phoneNumber: "",
    whatsappNumber: "",
    availableHours: {
      start: "08:00",
      end: "17:00",
      days: ["Monday"],
    },
    sessionCount: 20,
    verified: true,
    verificationStatus: "verified",
    credentialExpiresAt: new Date("2027-01-01T00:00:00.000Z"),
    maxConcurrentSessions: 2,
    acceptingNewSessions: true,
    crisisTrained: true,
    supervisorId: "supervisor-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("counsellor operational eligibility", () => {
  it("accepts a verified, scheduled, trained counsellor with capacity", () => {
    expect(
      evaluateCounsellorEligibility(counsellor(), {
        now,
        activeLoad: 1,
        priority: "critical",
      }),
    ).toEqual({ eligible: true, reasons: [] });
  });

  it("rejects demo, suspended, expired, off-shift, and full profiles", () => {
    expect(
      evaluateCounsellorEligibility(
        counsellor({
          verificationStatus: "suspended",
          credentialExpiresAt: new Date("2026-01-01"),
          acceptingNewSessions: false,
          availableHours: { start: "18:00", end: "20:00", days: ["Monday"] },
        }),
        { now, activeLoad: 2, priority: "critical" },
      ).reasons,
    ).toEqual([
      "verification_required",
      "credentials_expired",
      "not_accepting_sessions",
      "off_shift",
      "at_capacity",
    ]);
  });

  it("requires crisis training only for critical sessions", () => {
    const untrained = counsellor({ crisisTrained: false });
    expect(
      evaluateCounsellorEligibility(untrained, {
        now,
        activeLoad: 0,
        priority: "critical",
      }).reasons,
    ).toContain("crisis_training_required");
    expect(
      evaluateCounsellorEligibility(untrained, {
        now,
        activeLoad: 0,
        priority: "normal",
      }).eligible,
    ).toBe(true);
  });

  it("keeps verified counsellors present during active care even at capacity", () => {
    expect(evaluateCounsellorStanding(counsellor(), now)).toEqual({
      eligible: true,
      reasons: [],
    });
    expect(
      evaluateCounsellorStanding(
        counsellor({ verificationStatus: "suspended" }),
        now,
      ).reasons,
    ).toContain("verification_required");
  });

  it("evaluates overnight shifts in Kampala time", () => {
    expect(
      isCounsellorOnShift(
        counsellor({
          availableHours: {
            start: "20:00",
            end: "06:00",
            days: ["Monday"],
          },
        }),
        new Date("2026-07-27T20:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("availability failure guidance", () => {
  it("distinguishes verification, expiry and shift restrictions", () => {
    expect(
      describeCounsellorEligibilityFailure(["verification_required"]),
    ).toContain("verified counsellor record");
    expect(
      describeCounsellorEligibilityFailure(["credentials_expired"]),
    ).toContain("credential has expired");
    expect(describeCounsellorEligibilityFailure(["off_shift"])).toContain(
      "outside the shift hours",
    );
  });

  it("prioritizes verification when more than one restriction exists", () => {
    expect(
      describeCounsellorEligibilityFailure([
        "off_shift",
        "verification_required",
      ]),
    ).toContain("verified counsellor record");
  });
});

describe("crisis escalation policy", () => {
  const requestedAt = new Date("2026-07-27T09:00:00.000Z");
  const after = (minutes: number) =>
    new Date(requestedAt.getTime() + minutes * 60_000);

  it.each([
    [0, 0, "none"],
    [1, 1, "alert_counsellors"],
    [3, 2, "notify_supervisor"],
    [5, 3, "show_emergency_fallback"],
    [10, 4, "open_incident"],
  ] as const)("at %i minutes returns level %i and %s", (minutes, level, action) => {
    const currentLevel = level === 0 ? 0 : level - 1;
    expect(evaluateCrisisEscalation(requestedAt, currentLevel, after(minutes))).toEqual({
      level,
      action,
    });
  });

  it("does not emit the same escalation twice", () => {
    expect(evaluateCrisisEscalation(requestedAt, 3, after(6))).toEqual({
      level: 3,
      action: "none",
    });
  });
});
