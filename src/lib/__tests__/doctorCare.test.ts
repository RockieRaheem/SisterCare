import { describe, expect, it } from "vitest";
import {
  doctorIsAvailable,
  doctorLiveStatus,
  rankDoctors,
} from "@/lib/server/doctorCare";
import { Doctor } from "@/types";

function doctor(overrides: Partial<Doctor>): Doctor {
  return {
    id: crypto.randomUUID(),
    professionalName: "Dr Test",
    title: "Medical doctor",
    bio: "",
    specializations: ["General Practice"],
    languages: ["English"],
    yearsExperience: 2,
    photoURL: "",
    status: "offline",
    acceptingAppointments: true,
    verificationStatus: "verified",
    ...overrides,
  };
}

describe("doctor availability", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");

  it("requires verification, a live heartbeat, acceptance and valid credentials", () => {
    expect(
      doctorIsAvailable(
        {
          verification_status: "verified",
          accepting_appointments: true,
          status: "available",
          last_heartbeat_at: "2026-08-24T11:59:00.000Z",
          credential_expires_at: "2030-01-01",
        },
        now,
      ),
    ).toBe(true);
  });

  it("keeps a doctor available through the credential expiry date, not just midnight", () => {
    const row = {
      verification_status: "verified",
      accepting_appointments: true,
      status: "available",
      last_heartbeat_at: "2026-08-24T11:59:00.000Z",
      credential_expires_at: "2026-08-24",
    };
    expect(doctorIsAvailable(row, now)).toBe(true);
    expect(doctorIsAvailable(row, new Date("2026-08-25T00:00:00.000Z"))).toBe(false);
  });

  it.each([
    { verification_status: "pending" },
    { accepting_appointments: false },
    { status: "offline" },
    { last_heartbeat_at: "2026-08-24T11:55:00.000Z" },
    { credential_expires_at: "2026-08-23" },
  ])("fails closed when availability evidence is invalid", (change) => {
    expect(
      doctorIsAvailable(
        {
          verification_status: "verified",
          accepting_appointments: true,
          status: "available",
          last_heartbeat_at: "2026-08-24T11:59:00.000Z",
          credential_expires_at: "2030-01-01",
          ...change,
        },
        now,
      ),
    ).toBe(false);
  });

  it("does not trust a stale database status in the admin or member directory", () => {
    const row = {
      verification_status: "verified",
      accepting_appointments: true,
      status: "available",
      last_heartbeat_at: "2026-08-24T11:55:00.000Z",
      credential_expires_at: "2030-01-01",
    };
    expect(doctorLiveStatus(row, now)).toBe("offline");
    expect(doctorLiveStatus({ ...row, status: "busy", last_heartbeat_at: "2026-08-24T11:59:00.000Z" }, now)).toBe("busy");
    expect(doctorLiveStatus({ ...row, last_heartbeat_at: "2026-08-24T11:59:00.000Z" }, now)).toBe("available");
  });
});

describe("doctor relevance ranking", () => {
  it("prefers availability, relevant specialty and language", () => {
    const ranked = rankDoctors(
      [
        doctor({ id: "offline", yearsExperience: 20 }),
        doctor({
          id: "relevant",
          status: "available",
          specializations: ["Obstetrics & Gynaecology"],
          languages: ["Luganda"],
        }),
      ],
      "Obstetrics & Gynaecology",
      "Luganda",
    );
    expect(ranked[0].id).toBe("relevant");
  });
});
