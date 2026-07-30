import { describe, expect, it, vi } from "vitest";
import {
  getSupabaseServerKey,
  resilientSupabaseFetch,
  SupabaseVerificationUnavailableError,
  verifySupabaseAccessToken,
} from "../supabaseAdmin";

describe("Supabase access-token verification", () => {
  it("accepts only elevated server keys for administrative data access", () => {
    expect(getSupabaseServerKey({ SUPABASE_SECRET_KEY: "sb_secret_backend" })).toBe("sb_secret_backend");
    expect(() => getSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_public" })).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("accepts identity only from cryptographically verified claims", async () => {
    const verifier = vi.fn().mockResolvedValue({
      data: {
        claims: { sub: "user-1", email: "person@example.com" },
        header: {},
        signature: new Uint8Array(),
      },
      error: null,
    });
    const result = await verifySupabaseAccessToken(
      "valid-user-jwt",
      verifier,
    );

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe("user-1");
    expect(verifier).toHaveBeenCalledWith("valid-user-jwt");
  });

  it("returns a rejected token without treating it as a server outage", async () => {
    const result = await verifySupabaseAccessToken(
      "invalid-user-jwt",
      vi.fn().mockResolvedValue({
        data: null,
        error: new Error("invalid JWT"),
      }),
    );

    expect(result.user).toBeNull();
    expect(result.error?.message).toBe("invalid JWT");
  });

  it("distinguishes verifier outages from rejected credentials", async () => {
    await expect(
      verifySupabaseAccessToken(
        "temporarily-unverifiable-jwt",
        vi.fn().mockRejectedValue(new Error("fetch failed")),
      ),
    ).rejects.toBeInstanceOf(SupabaseVerificationUnavailableError);
  });
});

describe("resilient Supabase transport", () => {
  it("retries transient read failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await resilientSupabaseFetch(
      "https://project.supabase.co/rest/v1/profiles",
      { method: "GET" },
      fetcher,
      wait,
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });

  it("never replays a write request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));

    const response = await resilientSupabaseFetch(
      "https://project.supabase.co/rest/v1/profiles",
      { method: "PATCH" },
      fetcher,
      vi.fn(),
    );

    expect(response.status).toBe(503);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
