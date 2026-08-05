import { describe, expect, it } from "vitest";
import {
  getSessionDeclineNotice,
  getSessionStatusDescription,
  reviveSession,
} from "../sessionsClient";
import { buildDeclinedSessionDetails } from "../server/sessions";
import { CounsellingSession } from "@/types";

function session(
  overrides: Partial<CounsellingSession> = {},
): CounsellingSession {
  return {
    id: "session-1",
    userId: "member-1",
    counsellorId: null,
    state: "requested",
    priority: "normal",
    reason: "user_request",
    preferredCounsellorId: "counsellor-1",
    summary: "",
    requestedAt: new Date("2026-08-05T10:00:00.000Z"),
    matchAttempts: 1,
    declinedBy: ["counsellor-1"],
    lastDeclinedAt: new Date("2026-08-05T10:01:00.000Z"),
    preferredCounsellorDeclined: true,
    declineCount: 1,
    ...overrides,
  };
}

describe("counsellor decline handling", () => {
  it("releases a declined preferred counsellor for safe rematching", () => {
    const details = buildDeclinedSessionDetails(
      {
        preferredCounsellorId: "counsellor-1",
        counsellorName: "Counsellor One",
        context: "No chat context shared",
        declineCount: 0,
      },
      {
        counsellorId: "counsellor-1",
        declinedAt: new Date("2026-08-05T10:01:00.000Z"),
      },
    );

    expect(details).toEqual({
      context: "No chat context shared",
      lastDeclinedAt: "2026-08-05T10:01:00.000Z",
      declineCount: 1,
      preferredCounsellorDeclined: true,
    });
  });

  it("retains a different preferred counsellor while recording the decline", () => {
    const details = buildDeclinedSessionDetails(
      {
        preferredCounsellorId: "counsellor-2",
        counsellorName: "Counsellor One",
        declineCount: 2,
      },
      {
        counsellorId: "counsellor-1",
        declinedAt: new Date("2026-08-05T10:01:00.000Z"),
      },
    );

    expect(details).toMatchObject({
      preferredCounsellorId: "counsellor-2",
      lastDeclinedAt: "2026-08-05T10:01:00.000Z",
      declineCount: 3,
      preferredCounsellorDeclined: false,
    });
    expect(details).not.toHaveProperty("counsellorName");
  });

  it("creates a unique, actionable member notification", () => {
    expect(getSessionDeclineNotice(session())).toEqual({
      key: "declined:session-1:2026-08-05T10:01:00.000Z",
      title: "Counsellor request update",
      message:
        "The counsellor you selected could not take this request. SisterCare is finding another available counsellor.",
    });
  });

  it("shows rematching progress in requested and matched states", () => {
    expect(getSessionStatusDescription(session())).toContain(
      "finding another available counsellor",
    );
    expect(
      getSessionStatusDescription(session({ state: "matched" })),
    ).toContain("Another verified counsellor");
  });

  it("does not repeat an old decline after the session becomes active", () => {
    expect(getSessionDeclineNotice(session({ state: "active" }))).toBeNull();
  });

  it("revives decline timestamps returned by the API", () => {
    const revived = reviveSession({
      ...session(),
      lastDeclinedAt: "2026-08-05T10:01:00.000Z" as unknown as Date,
    });

    expect(revived.lastDeclinedAt).toBeInstanceOf(Date);
    expect(getSessionDeclineNotice(revived)?.key).toBe(
      "declined:session-1:2026-08-05T10:01:00.000Z",
    );
  });
});
