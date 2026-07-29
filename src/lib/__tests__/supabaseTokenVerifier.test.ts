import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseServerKey, verifySupabaseAccessToken } from "../supabaseAdmin";

describe("Supabase access-token verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("accepts only elevated server keys for administrative data access", () => {
    expect(getSupabaseServerKey({ SUPABASE_SECRET_KEY: "sb_secret_backend" })).toBe("sb_secret_backend");
    expect(() => getSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_public" })).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("validates the bearer token against the configured Auth project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "user-1",
      email: "person@example.com",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifySupabaseAccessToken("valid-user-jwt");

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe("user-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: {
          apikey: "sb_publishable_test",
          Authorization: "Bearer valid-user-jwt",
        },
      }),
    );
  });

  it("returns a rejected token without treating it as a server outage", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "invalid JWT" }),
      { status: 401 },
    )));

    const result = await verifySupabaseAccessToken("invalid-user-jwt");

    expect(result.user).toBeNull();
    expect(result.error?.message).toBe("invalid JWT");
  });
});
