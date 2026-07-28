import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

function keyFor(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 48); }

/** Transactional shared quota: survives Vercel instance churn and retries. */
export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
  const db = getAdminDb();
  if (!db) return { allowed: process.env.NODE_ENV !== "production", retryAfterSeconds: 60 };
  const ref = db.collection("rate_limits").doc(`${scope}-${keyFor(identity)}`);
  return db.runTransaction(async (transaction) => {
    const current = transaction.get(ref); const snapshot = await current;
    const data = snapshot.data(); const started = data?.windowStartedAt instanceof Timestamp ? data.windowStartedAt.toMillis() : 0;
    const count = typeof data?.count === "number" ? data.count : 0;
    if (!started || now - started >= windowMs) {
      transaction.set(ref, { count: 1, windowStartedAt: Timestamp.fromMillis(now), updatedAt: Timestamp.fromMillis(now) });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - started)) / 1000));
    if (count >= limit) return { allowed: false, retryAfterSeconds };
    transaction.update(ref, { count: count + 1, updatedAt: Timestamp.fromMillis(now) });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

export async function enforceChatRateLimit(userId: string, forwardedFor: string | null): Promise<RateLimitResult> {
  const user = await consumeRateLimit("chat-user", userId, 12, 60_000);
  if (!user.allowed) return user;
  const ip = (forwardedFor || "unknown").split(",")[0].trim().slice(0, 128);
  return consumeRateLimit("chat-ip", ip, 60, 60_000);
}
