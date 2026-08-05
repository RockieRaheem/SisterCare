import { describe, expect, it } from "vitest";
import { deriveLiveCounsellorStatus } from "../server/serverData";
import { Counsellor } from "@/types";

function counsellor(
  overrides: Partial<Counsellor & { lastHeartbeat?: Date }> = {},
): Counsellor & { lastHeartbeat?: Date } {
  return {
    id: "counsellor-1",
    name: "Counsellor",
    title: "Counsellor",
    bio: "",
    photoURL: "",
    specializations: ["Mental Health"],
    languages: ["English"],
    rating: 0,
    reviewCount: 0,
    yearsExperience: 1,
    phoneNumber: "",
    whatsappNumber: "",
    availableHours: {
      start: "00:00",
      end: "23:59",
      days: ["Wednesday"],
    },
    sessionCount: 0,
    status: "available",
    verified: true,
    verificationStatus: "verified",
    acceptingNewSessions: true,
    maxConcurrentSessions: 1,
    crisisTrained: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastHeartbeat: new Date("2026-08-05T05:00:00.000Z"),
    ...overrides,
  };
}

const now = new Date("2026-08-05T05:01:00.000Z").getTime();

describe("authoritative counsellor availability", () => {
  it("keeps an explicitly offline counsellor offline despite a fresh heartbeat", () => {
    expect(
      deriveLiveCounsellorStatus(
        counsellor({ status: "offline" }),
        false,
        now,
      ),
    ).toBe("offline");
  });

  it("shows available only when stored presence and heartbeat agree", () => {
    expect(deriveLiveCounsellorStatus(counsellor(), false, now)).toBe(
      "available",
    );
    expect(
      deriveLiveCounsellorStatus(
        counsellor({
          lastHeartbeat: new Date("2026-08-05T04:55:00.000Z"),
        }),
        false,
        now,
      ),
    ).toBe("offline");
  });

  it("shows an assigned professional as in session", () => {
    expect(
      deriveLiveCounsellorStatus(
        counsellor({ status: "in_session" }),
        true,
        now,
      ),
    ).toBe("in_session");
  });
});
