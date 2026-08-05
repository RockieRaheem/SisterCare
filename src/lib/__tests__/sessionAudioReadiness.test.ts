import { describe, expect, it } from "vitest";
import { classifyAudioStorageError } from "../server/sessionAudio";

describe("private audio storage readiness", () => {
  it("identifies a missing audio table", () => {
    expect(
      classifyAudioStorageError({
        code: "42P01",
        message: 'relation "public.session_audio_calls" does not exist',
      }),
    ).toMatchObject({
      name: "SessionAudioStorageError",
      code: "audio_schema_missing",
    });
  });

  it("identifies an old audio table missing Daily lifecycle columns", () => {
    expect(
      classifyAudioStorageError({
        code: "42703",
        message: 'column "room_expires_at" does not exist',
      }),
    ).toMatchObject({ code: "audio_schema_missing" });
  });

  it("keeps transient storage failures distinct from missing schema", () => {
    expect(
      classifyAudioStorageError({
        code: "08006",
        message: "connection failure",
      }),
    ).toMatchObject({ code: "audio_storage_unavailable" });
  });
});
