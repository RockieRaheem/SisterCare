import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function retryDelay(response: Response | null, attempt: number): number {
  const retryAfter = Number(response?.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 1_500);
  }
  return attempt * 150;
}

/** Retry only idempotent Supabase reads; writes are never replayed. */
export async function resilientSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const attempts = method === "GET" || method === "HEAD" ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(input, init);
      if (
        attempt === attempts ||
        !TRANSIENT_STATUS.has(response.status)
      ) {
        return response;
      }
      await wait(retryDelay(response, attempt));
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await wait(retryDelay(null, attempt));
    }
  }
  throw lastError || new Error("Supabase request failed");
}

export class SupabaseVerificationUnavailableError extends Error {
  constructor(message = "Supabase authentication verification is unavailable") {
    super(message);
    this.name = "SupabaseVerificationUnavailableError";
  }
}

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
    adminClient = createClient(url, serverKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { fetch: resilientSupabaseFetch },
    });
  }
  return adminClient;
}

type ClaimsResult = Awaited<
  ReturnType<SupabaseClient["auth"]["getClaims"]>
>;

/** Verify an end-user JWT using cached JWKS where the project supports it. */
export async function verifySupabaseAccessToken(
  accessToken: string,
  verifyClaims: (token: string) => Promise<ClaimsResult> = (token) =>
    getSupabaseAdmin().auth.getClaims(token),
): Promise<{ user: User | null; error: Error | null }> {
  try {
    const result = await verifyClaims(accessToken);
    if (result.error || !result.data?.claims?.sub) {
      return {
        user: null,
        error: new Error(result.error?.message || "Supabase rejected the access token"),
      };
    }
    return {
      user: {
        id: result.data.claims.sub,
        email:
          typeof result.data.claims.email === "string"
            ? result.data.claims.email
            : undefined,
      } as User,
      error: null,
    };
  } catch (error) {
    throw new SupabaseVerificationUnavailableError(
      error instanceof Error ? error.message : undefined,
    );
  }
}
