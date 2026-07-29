import { describe, expect, it } from "vitest";
import { evaluateCounsellorEligibility } from "../counsellorOperations";
import { counsellorFromDatabaseRow } from "../server/counsellorRecord";

describe("stored counsellor records", () => {
  it("restores credential and heartbeat timestamps as dates", () => {
    const counsellor = counsellorFromDatabaseRow({
      id: "counsellor-1",
      profile: {
        name: "Sister Amina",
        credentialExpiresAt: "2030-10-24T00:00:00.000Z",
      },
      verification_status: "verified",
      last_heartbeat: "2026-07-29T12:00:00.000Z",
    });

    expect(counsellor.credentialExpiresAt).toBeInstanceOf(Date);
    expect(counsellor.credentialExpiresAt?.toISOString()).toBe(
      "2030-10-24T00:00:00.000Z",
    );
    expect(counsellor.lastHeartbeat).toBeInstanceOf(Date);
  });

  it("safely evaluates incomplete stored profiles", () => {
    const counsellor = counsellorFromDatabaseRow({
      id: "counsellor-2",
      profile: {},
      verification_status: "pending",
    });

    expect(() =>
      evaluateCounsellorEligibility(counsellor, {
        activeLoad: 0,
        priority: "normal",
        now: new Date("2026-07-29T12:00:00.000Z"),
      }),
    ).not.toThrow();
    expect(counsellor.availableHours).toEqual({
      start: "08:00",
      end: "17:00",
      days: [],
    });
  });

  it("drops invalid stored dates instead of crashing the directory", () => {
    const counsellor = counsellorFromDatabaseRow({
      id: "counsellor-3",
      profile: { credentialExpiresAt: "not-a-date" },
      verification_status: "verified",
    });

    expect(counsellor.credentialExpiresAt).toBeUndefined();
  });
});
