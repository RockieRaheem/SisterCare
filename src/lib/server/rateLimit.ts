import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

function keyFor(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 48);
}

/** Atomic shared quota that survives Vercel instance churn and concurrent requests. */
export async function consumeRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_rate_limit", {
      rate_key: `${scope}-${keyFor(identity)}`,
      request_limit: limit,
      window_ms: windowMs,
      request_time: new Date(now).toISOString(),
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return {
      allowed: result?.allowed === true,
      retryAfterSeconds: Number(result?.retry_after_seconds || 0),
    };
  } catch (error) {
    console.error("Shared rate limit failed:", error);
    return { allowed: process.env.NODE_ENV !== "production", retryAfterSeconds: 60 };
  }
}

export async function enforceChatRateLimit(userId: string, forwardedFor: string | null): Promise<RateLimitResult> {
  const user = await consumeRateLimit("chat-user", userId, 12, 60_000);
  if (!user.allowed) return user;
  const ip = (forwardedFor || "unknown").split(",")[0].trim().slice(0, 128);
  return consumeRateLimit("chat-ip", ip, 60, 60_000);
}
