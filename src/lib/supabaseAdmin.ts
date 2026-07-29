import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseServerKey(
  env: Record<string, string | undefined> = process.env,
): string {
  const key = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (key.startsWith("sb_secret_")) return key;

  // Continue accepting the legacy JWT-based service_role key during Supabase's
  // migration period, but never silently initialize an admin client with an
  // anon/publishable key.
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString("utf8")) as { role?: string };
    if (payload.role === "service_role") return key;
  } catch {
    // The actionable configuration error below is safer than exposing parsing details.
  }
  throw new Error("Set SUPABASE_SECRET_KEY to an sb_secret_ key, or SUPABASE_SERVICE_ROLE_KEY to a legacy service_role JWT");
}

/** Server-only client. Never import this module into a client component. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Supabase server access is not configured. Set NEXT_PUBLIC_SUPABASE_URL.");
  }
  const serverKey = getSupabaseServerKey();
  if (!adminClient) {
    adminClient = createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return adminClient;
}

/** Validate an end-user JWT directly against the configured Supabase Auth project. */
export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<{ user: User | null; error: Error | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase Auth verification is not configured");

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; msg?: string } | null;
    return {
      user: null,
      error: new Error(payload?.message || payload?.msg || `Supabase rejected the access token (${response.status})`),
    };
  }
  return { user: await response.json() as User, error: null };
}
