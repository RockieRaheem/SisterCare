/** Supabase-backed server authentication and authorization boundary. */
import {
  getSupabaseAdmin,
  SupabaseVerificationUnavailableError,
  verifySupabaseAccessToken,
} from "./supabaseAdmin";

export type UserRole = "user" | "counsellor" | "admin";
export const USER_ROLES: UserRole[] = ["user", "counsellor", "admin"];
export type AuthResult =
  | { status: "verified"; uid: string; token: { uid: string; email?: string; role?: UserRole } }
  | { status: "unauthenticated"; reason?: "missing_token" | "invalid_token" }
  | { status: "unavailable"; reason: "token_verifier" | "profile_lookup" }
  | { status: "unenforced" };

export function allowsUnauthenticatedDevelopment(env: { NODE_ENV?: string; ALLOW_UNAUTHENTICATED_DEV?: string } = process.env) {
  return env.NODE_ENV !== "production" && env.ALLOW_UNAUTHENTICATED_DEV === "true";
}
export function validateProductionSecurityConfig(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const errors: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY)) errors.push("Supabase URL, publishable key, and a server secret key are required in production");
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) errors.push("CRON_SECRET must contain at least 32 characters");
  if (!env.TELEMETRY_HASH_SALT || env.TELEMETRY_HASH_SALT.length < 32) errors.push("TELEMETRY_HASH_SALT must contain at least 32 characters");
  if (!env.GEMINI_API_KEY && !env.GROQ_API_KEY) errors.push("At least one AI provider API key is required in production");
  if (env.ALLOW_UNAUTHENTICATED_DEV === "true") errors.push("ALLOW_UNAUTHENTICATED_DEV cannot be enabled in production");
  return errors;
}

export function isAuthEnforced() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)); }

export async function setUserRole(uid: string, role: UserRole) {
  const { error } = await getSupabaseAdmin().from("profiles").update({ role: role === "user" ? "member" : role }).eq("id", uid);
  if (error) throw new Error(error.message);
}
export async function getUidByEmail(email: string) { const { data, error } = await getSupabaseAdmin().from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle(); if (error) throw new Error(error.message); return data?.id || null; }
export async function deleteAuthUser(uid: string) { const { error } = await getSupabaseAdmin().auth.admin.deleteUser(uid); if (error) throw new Error(error.message); }
export function hasRole(auth: AuthResult, role: UserRole) { return auth.status === "verified" && auth.token.role === role; }
export function getAuthorizationFailure(
  auth: AuthResult,
  role?: UserRole,
): { status: 401 | 403 | 503; error: string } | null {
  if (auth.status === "unavailable") {
    return {
      status: 503,
      error: "Authentication verification is temporarily unavailable. Please retry.",
    };
  }
  if (auth.status !== "verified") {
    return {
      status: 401,
      error: "Your session is missing or expired. Please sign in again.",
    };
  }
  if (role && !hasRole(auth, role)) {
    return {
      status: 403,
      error: `${role === "admin" ? "Administrator" : "Counsellor"} access required`,
    };
  }
  return null;
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return allowsUnauthenticatedDevelopment() ? { status: "unenforced" } : { status: "unauthenticated", reason: "missing_token" };
  try {
    // getUser(accessToken) asks the Supabase Auth server to validate the exact
    // browser JWT. It does not trust locally decoded or browser-stored claims.
    const { user, error: authError } = await verifySupabaseAccessToken(match[1]);
    if (authError || !user) {
      console.warn("Supabase rejected a bearer token:", authError?.message || "user missing");
      return { status: "unauthenticated", reason: "invalid_token" };
    }
    let profileResult;
    try {
      profileResult = await getSupabaseAdmin().from("profiles").select("role").eq("id", user.id).maybeSingle();
    } catch (error) {
      console.warn("Supabase profile authorization client failed:", error);
      return { status: "unavailable", reason: "profile_lookup" };
    }
    const { data: record, error } = profileResult;
    if (error) {
      console.warn("Supabase profile authorization lookup failed:", error.message);
      return { status: "unavailable", reason: "profile_lookup" };
    }
    // A valid Supabase identity remains authenticated even if its application
    // profile was not created by the database trigger. Role checks still fail
    // closed because the role remains undefined; bootstrap/profile recovery
    // routes can safely repair the missing row using the verified user id.
    const role = record?.role === "member" ? "user" : record?.role as UserRole | undefined;
    return { status: "verified", uid: user.id, token: { uid: user.id, email: user.email, role } };
  } catch (error) {
    console.warn("Supabase access-token verification failed:", error);
    return {
      status: "unavailable",
      reason:
        error instanceof SupabaseVerificationUnavailableError
          ? "token_verifier"
          : "profile_lookup",
    };
  }
}
