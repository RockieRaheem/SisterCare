import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSessionAudioRoom: vi.fn(),
}));

vi.mock("../server/sessionAudio", () => ({
  ensureSessionAudioRoom: mocks.ensureSessionAudioRoom,
  finishSessionAudio: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("../server/events", () => ({
  emitEvent: vi.fn(),
}));

vi.mock("../server/incidents", () => ({
  openCrisisIncident: vi.fn(),
}));

import {
  isSessionReadyForMember,
} from "../sessionsClient";
import {
  prepareSessionAudioForAcceptance,
} from "../server/sessions";
import { CounsellingSession } from "@/types";

function session(
  overrides: Partial<CounsellingSession> = {},
): CounsellingSession {
  return {
    id: "session-1",
    userId: "member-1",
    counsellorId: "counsellor-1",
    state: "active",
    priority: "normal",
    reason: "user_request",
    summary: "",
    requestedAt: new Date("2026-08-05T08:00:00.000Z"),
    matchAttempts: 1,
    declinedBy: [],
    ...overrides,
  };
}

describe("counsellor session acceptance", () => {
  beforeEach(() => {
    mocks.ensureSessionAudioRoom.mockReset();
  });

  it("opens text care even when private audio is temporarily unavailable", async () => {
    mocks.ensureSessionAudioRoom.mockRejectedValue(
      new Error("Daily credentials rejected"),
    );
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      prepareSessionAudioForAcceptance("session-1", "counsellor-1"),
    ).resolves.toMatchObject({
      audioReady: false,
      audioUnavailableAt: expect.any(String),
    });
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it("records the private room expiry when audio preparation succeeds", async () => {
    mocks.ensureSessionAudioRoom.mockResolvedValue({
      room_expires_at: "2026-08-05T09:30:00.000Z",
    });

    await expect(
      prepareSessionAudioForAcceptance("session-1", "counsellor-1"),
    ).resolves.toEqual({
      audioReady: true,
      audioExpiresAt: "2026-08-05T09:30:00.000Z",
    });
  });

  it("notifies a member when text care is active without waiting for audio", () => {
    expect(isSessionReadyForMember(session({ audioReady: false }))).toBe(true);
    expect(isSessionReadyForMember(session({ audioReady: undefined }))).toBe(
      true,
    );
    expect(isSessionReadyForMember(session({ state: "matched" }))).toBe(false);
  });
});
