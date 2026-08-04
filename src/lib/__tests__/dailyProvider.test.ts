import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPrivateDailyJoin,
  createPrivateDailyRoom,
  dailyRoomName,
  normalizeDailyDomain,
  validateDailyRoomUrl,
} from "../server/dailyProvider";

describe("Daily private audio boundary", () => {
  beforeEach(() => {
    process.env.DAILY_API_KEY = "daily-server-secret";
    process.env.DAILY_DOMAIN = "raheemlabs.daily.co";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DAILY_API_KEY;
    delete process.env.DAILY_DOMAIN;
  });

  it("normalizes only a safe HTTPS Daily host configuration", () => {
    expect(normalizeDailyDomain("raheemlabs.daily.co")).toBe(
      "raheemlabs.daily.co",
    );
    expect(normalizeDailyDomain("https://raheemlabs.daily.co")).toBe(
      "raheemlabs.daily.co",
    );
    expect(() =>
      normalizeDailyDomain("https://raheemlabs.daily.co/room"),
    ).toThrow("invalid");
  });

  it("accepts only the configured host and expected room", () => {
    expect(
      validateDailyRoomUrl(
        "https://raheemlabs.daily.co/private-room",
        "raheemlabs.daily.co",
        "private-room",
      ),
    ).toBe("https://raheemlabs.daily.co/private-room");
    expect(() =>
      validateDailyRoomUrl(
        "https://lookalike.example/private-room",
        "raheemlabs.daily.co",
        "private-room",
      ),
    ).toThrow("untrusted");
  });

  it("creates an expiring private two-person audio-only room", async () => {
    const roomName = dailyRoomName("session-1", "daily-server-secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          name: roomName,
          url: `https://raheemlabs.daily.co/${roomName}`,
          config: { exp: 1_800_005_400 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const room = await createPrivateDailyRoom({
      sessionId: "session-1",
      now: new Date(1_800_000_000_000),
    });
    expect(room.roomName).toBe(roomName);
    const request = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(request.privacy).toBe("private");
    expect(request.properties).toMatchObject({
      max_participants: 2,
      enable_screenshare: false,
      enable_chat: false,
      eject_at_room_exp: true,
      start_video_off: true,
    });
    expect(request.properties.permissions.canSend).toEqual(["audio"]);
    expect(request.properties).not.toHaveProperty("enable_recording");
  });

  it("creates distinct short-lived audio-only participant tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "member-token" }))
      .mockResolvedValueOnce(Response.json({ token: "counsellor-token" }));
    vi.stubGlobal("fetch", fetchMock);
    const expiresAt = new Date(Date.now() + 60 * 60_000);

    const member = await createPrivateDailyJoin({
      roomName: "private-room",
      participantId: "member-id",
      participantRole: "member",
      expiresAt,
    });
    const counsellor = await createPrivateDailyJoin({
      roomName: "private-room",
      participantId: "counsellor-id",
      participantRole: "counsellor",
      expiresAt,
    });

    expect(member.token).toBe("member-token");
    expect(counsellor.token).toBe("counsellor-token");
    const memberBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const counsellorBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(memberBody.properties.user_id).not.toBe(
      counsellorBody.properties.user_id,
    );
    expect(memberBody.properties.permissions.canSend).toEqual(["audio"]);
    expect(memberBody.properties.enable_recording_ui).toBe(false);
    expect(memberBody.properties.enable_screenshare).toBe(false);
  });
});
