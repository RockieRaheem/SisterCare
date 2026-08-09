import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { NoSpeechDetectedError } from "../speechTranscription";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  transcribe: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  getAuthorizationFailure: () => null,
}));

vi.mock("../server/rateLimit", () => ({
  consumeRateLimit: mocks.rateLimit,
}));

vi.mock("../speechTranscription", async (importOriginal) => {
  const original = await importOriginal<typeof import("../speechTranscription")>();
  return { ...original, transcribeSpeech: mocks.transcribe };
});

vi.mock("../observability", () => ({
  logOperationalEvent: vi.fn(),
  withApiObservability: (_name: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/language/transcribe/route";

function request(options: { durationMs?: number; bytes?: number } = {}) {
  const form = new FormData();
  form.append(
    "audio",
    new File([new Uint8Array(options.bytes ?? 1_024)], "voice.webm", {
      type: "audio/webm",
    }),
  );
  form.append("language", "lug");
  form.append("durationMs", String(options.durationMs ?? 1_000));
  return new NextRequest("https://sistercare.test/api/language/transcribe", {
    method: "POST",
    body: form,
  });
}

describe("voice transcription route", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue({
      status: "verified",
      uid: "member-1",
    });
    mocks.rateLimit.mockReset().mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.transcribe.mockReset().mockResolvedValue({
      transcript: "Nneetaaga obuyambi",
      language: "lug",
      provider: "sunbird",
      fallbackUsed: false,
      wasAudioTrimmed: false,
      originalDurationMinutes: null,
    });
  });

  it("returns a private, non-cached transcript", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { transcript: "Nneetaaga obuyambi", provider: "sunbird" },
    });
  });

  it("rejects recordings too short to contain useful speech", async () => {
    const response = await POST(request({ durationMs: 100, bytes: 100 }));

    expect(response.status).toBe(400);
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });

  it("returns a reviewable no-speech response", async () => {
    mocks.transcribe.mockRejectedValue(new NoSpeechDetectedError());

    const response = await POST(request());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it("enforces the authenticated voice quota", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 12 });

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });
});
