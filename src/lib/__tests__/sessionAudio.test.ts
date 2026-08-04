import { describe, expect, it } from "vitest";
import { serializeSessionAudioCall } from "../server/sessionAudio";

describe("session audio participant state", () => {
  const row = {
    id: "call-id",
    state: "active",
    provider_room_id: "must-not-leak",
    room_expires_at: "2026-08-04T18:00:00.000Z",
    member_joined_at: "2026-08-04T17:00:00.000Z",
    member_left_at: null,
    counsellor_joined_at: "2026-08-04T17:00:03.000Z",
    counsellor_left_at: "2026-08-04T17:10:00.000Z",
    duration_seconds: 600,
  };

  it("reports connection state from the caller's perspective", () => {
    expect(serializeSessionAudioCall(row, "member")).toMatchObject({
      currentParticipantConnected: true,
      otherParticipantConnected: false,
    });
    expect(serializeSessionAudioCall(row, "counsellor")).toMatchObject({
      currentParticipantConnected: false,
      otherParticipantConnected: true,
    });
  });

  it("does not expose provider room identifiers or participant timestamps", () => {
    const serialized = serializeSessionAudioCall(row, "member");
    expect(serialized).not.toHaveProperty("providerRoomId");
    expect(serialized).not.toHaveProperty("provider_room_id");
    expect(serialized).not.toHaveProperty("memberJoinedAt");
    expect(serialized).not.toHaveProperty("counsellorJoinedAt");
  });
});
