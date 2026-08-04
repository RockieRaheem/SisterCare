import { describe, expect, it } from "vitest";
import {
  allowsUnauthenticatedDevelopment,
  validateProductionSecurityConfig,
} from "@/lib/serverAuth";

describe("fail-closed API security configuration", () => {
  it("allows unenforced auth only through an explicit non-production opt-in", () => {
    expect(
      allowsUnauthenticatedDevelopment({
        NODE_ENV: "development",
        ALLOW_UNAUTHENTICATED_DEV: "true",
      }),
    ).toBe(true);
    expect(
      allowsUnauthenticatedDevelopment({
        NODE_ENV: "development",
        ALLOW_UNAUTHENTICATED_DEV: "false",
      }),
    ).toBe(false);
    expect(
      allowsUnauthenticatedDevelopment({
        NODE_ENV: "production",
        ALLOW_UNAUTHENTICATED_DEV: "true",
      }),
    ).toBe(false);
  });

  it("rejects production without Supabase credentials and strong operations secrets", () => {
    expect(
      validateProductionSecurityConfig({
        NODE_ENV: "production",
        ALLOW_UNAUTHENTICATED_DEV: "false",
      }),
    ).toEqual([
      "Supabase URL, publishable key, and a server secret key are required in production",
      "CRON_SECRET must contain at least 32 characters",
      "TELEMETRY_HASH_SALT must contain at least 32 characters",
      "At least one AI provider API key is required in production",
      "DAILY_API_KEY and DAILY_DOMAIN are required for private counselling audio",
    ]);
  });

  it("accepts a fully configured production environment", () => {
    expect(
      validateProductionSecurityConfig({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        SUPABASE_SECRET_KEY: "sb_secret_example",
        CRON_SECRET: "a".repeat(32),
        TELEMETRY_HASH_SALT: "b".repeat(32),
        GROQ_API_KEY: "groq-test-key",
        DAILY_API_KEY: "daily-test-key",
        DAILY_DOMAIN: "raheemlabs.daily.co",
        ALLOW_UNAUTHENTICATED_DEV: "false",
      }),
    ).toEqual([]);
  });
});
