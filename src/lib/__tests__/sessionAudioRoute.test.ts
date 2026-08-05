import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  createSessionParticipantJoin: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  isAuthEnforced: () => true,
}));

vi.mock("../server/sessions", () => ({
  getSession: mocks.getSession,
}));

vi.mock("../server/sessionAudio", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../server/sessionAudio")>();
  return {
    ...original,
    createSessionParticipantJoin: mocks.createSessionParticipantJoin,
  };
});

import { POST } from "@/app/api/sessions/[id]/audio/route";
import { DailyProviderUnavailableError } from "../server/dailyProvider";
import { SessionAudioStorageError } from "../server/sessionAudio";

const context = {
  params: Promise.resolve({ id: "session-1" }),
};

function joinRequest() {
  return new NextRequest(
    "https://sistercare.test/api/sessions/session-1/audio",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", microphoneConsent: true }),
    },
  );
}

describe("private session audio route", () => {
  beforeEach(() => {
    mocks.authenticateRequest.mockReset();
    mocks.createSessionParticipantJoin.mockReset();
    mocks.getSession.mockReset();
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "member-1",
    });
    mocks.getSession.mockResolvedValue({
      id: "session-1",
      userId: "member-1",
      counsellorId: "counsellor-1",
      state: "active",
    });
  });

  it("returns private room access to an active participant", async () => {
    mocks.createSessionParticipantJoin.mockResolvedValue({
      call: {
        id: "call-1",
        state: "ready",
        room_expires_at: "2026-08-05T07:00:00.000Z",
      },
      roomUrl: "https://raheemlabs.daily.co/private-room",
      token: "participant-token",
    });

    const response = await POST(joinRequest(), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        roomUrl: "https://raheemlabs.daily.co/private-room",
        token: "participant-token",
      },
    });
  });

  it("returns an actionable provider configuration code", async () => {
    mocks.createSessionParticipantJoin.mockRejectedValue(
      new DailyProviderUnavailableError(
        "The configured Daily domain does not match the room provider.",
        "configuration_invalid",
      ),
    );

    const response = await POST(joinRequest(), context);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "configuration_invalid",
      fallback: "text",
    });
  });

  it("identifies an unapplied Supabase audio migration", async () => {
    mocks.createSessionParticipantJoin.mockRejectedValue(
      new SessionAudioStorageError("audio_schema_missing"),
    );

    const response = await POST(joinRequest(), context);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "audio_schema_missing",
      fallback: "text",
    });
  });
});
