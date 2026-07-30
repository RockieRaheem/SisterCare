import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
type LocalBucket = { count: number; windowStartedAt: number };
const localBuckets = new Map<string, LocalBucket>();

function keyFor(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 48);
}

/** Bounded per-instance fallback used only while the shared quota is unavailable. */
export function consumeLocalRateLimit(
  identity: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  if (localBuckets.size > 2_000) {
    for (const [key, bucket] of localBuckets) {
      if (now - bucket.windowStartedAt >= windowMs) localBuckets.delete(key);
    }
  }
  const bucket = localBuckets.get(identity);
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    localBuckets.set(identity, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowMs - (now - bucket.windowStartedAt)) / 1000),
      ),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
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
    console.warn(
      "Shared rate limit unavailable; applying bounded instance fallback:",
      error,
    );
    return consumeLocalRateLimit(
      `${scope}-${keyFor(identity)}`,
      limit,
      windowMs,
      now,
    );
  }
}

export async function enforceChatRateLimit(userId: string, forwardedFor: string | null): Promise<RateLimitResult> {
  const user = await consumeRateLimit("chat-user", userId, 12, 60_000);
  if (!user.allowed) return user;
  const ip = (forwardedFor || "unknown").split(",")[0].trim().slice(0, 128);
  return consumeRateLimit("chat-ip", ip, 60, 60_000);
}
