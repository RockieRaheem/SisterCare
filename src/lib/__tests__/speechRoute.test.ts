import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  quota: vi.fn(),
  synthesize: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  getAuthorizationFailure: () => null,
}));
vi.mock("../server/rateLimit", () => ({ consumeRateLimit: mocks.quota }));
vi.mock("../spokenResponse", () => ({
  synthesizeSpokenResponse: mocks.synthesize,
}));
vi.mock("../observability", () => ({
  logOperationalEvent: vi.fn(),
  withApiObservability: (_name: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/language/speak/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("https://sistercare.test/api/language/speak", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("spoken response route", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue({ status: "verified", uid: "member-1" });
    mocks.quota.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.synthesize.mockReset().mockResolvedValue({
      url: "https://audio.test/reply.wav",
      durationSeconds: 3,
      mimeType: "audio/wav",
      language: "eng",
      voice: "salt_eng_0001",
    });
  });

  it("creates private replay audio for a historical response", async () => {
    const response = await POST(request({ text: "I am listening.", language: "eng" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(mocks.synthesize).toHaveBeenCalledWith(
      "I am listening.",
      "eng",
      undefined,
      "salt_eng_0001",
    );
  });

  it("enforces the approved voice when a client sends a legacy choice", async () => {
    const response = await POST(request({
      text: "Oli otya?",
      language: "lug",
      voice: "waxal_lug_0006",
    }));
    expect(response.status).toBe(200);
    expect(mocks.synthesize).toHaveBeenCalledWith(
      "Oli otya?",
      "lug",
      undefined,
      "salt_lug_0001",
    );
  });

  it("reports a language whose provider has no selectable voice", async () => {
    const response = await POST(request({ text: "Hello", language: "lgg" }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "VOICE_NOT_AVAILABLE",
    });
  });

  it("identifies an invalid provider token without exposing credentials", async () => {
    mocks.synthesize.mockRejectedValue(
      new Error("TTS failed: Could not validate credentials"),
    );
    const response = await POST(request({ text: "Hello", language: "eng" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "SPEECH_PROVIDER_AUTH_INVALID",
    });
  });

  it("rejects unsupported speech languages", async () => {
    const response = await POST(request({ text: "Hello", language: "fra" }));
    expect(response.status).toBe(400);
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });

  it("enforces a bounded per-user speech quota", async () => {
    mocks.quota.mockResolvedValue({ allowed: false, retryAfterSeconds: 8 });
    const response = await POST(request({ text: "Hello", language: "eng" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("8");
  });
});
