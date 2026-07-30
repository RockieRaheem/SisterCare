import { describe, expect, it } from "vitest";
import { consumeLocalRateLimit } from "../server/rateLimit";

describe("local rate-limit fallback", () => {
  it("allows requests within the bounded window and rejects excess", () => {
    const key = `user-${Math.random()}`;
    expect(consumeLocalRateLimit(key, 2, 60_000, 1_000).allowed).toBe(true);
    expect(consumeLocalRateLimit(key, 2, 60_000, 2_000).allowed).toBe(true);
    const blocked = consumeLocalRateLimit(key, 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
  });

  it("opens a fresh quota window after expiry", () => {
    const key = `user-${Math.random()}`;
    consumeLocalRateLimit(key, 1, 1_000, 1_000);
    expect(consumeLocalRateLimit(key, 1, 1_000, 2_000)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });
});
