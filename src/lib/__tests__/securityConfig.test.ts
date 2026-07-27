import { describe, expect, it } from "vitest";
import {
  allowsUnauthenticatedDevelopment,
  validateProductionSecurityConfig,
} from "@/lib/firebaseAdmin";

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

  it("rejects production without Admin credentials and strong operations secrets", () => {
    expect(
      validateProductionSecurityConfig({
        NODE_ENV: "production",
        ALLOW_UNAUTHENTICATED_DEV: "false",
      }),
    ).toEqual([
      "Firebase Admin credentials are required in production",
      "CRON_SECRET must contain at least 32 characters",
      "TELEMETRY_HASH_SALT must contain at least 32 characters",
    ]);
  });

  it("accepts a fully configured production environment", () => {
    expect(
      validateProductionSecurityConfig({
        NODE_ENV: "production",
        FIREBASE_SERVICE_ACCOUNT_KEY: "{}",
        CRON_SECRET: "a".repeat(32),
        TELEMETRY_HASH_SALT: "b".repeat(32),
        ALLOW_UNAUTHENTICATED_DEV: "false",
      }),
    ).toEqual([]);
  });
});
