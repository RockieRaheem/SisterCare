/**
 * Server authentication boundary. The filename remains during the staged
 * import rename; all authentication and role data is now Supabase-backed.
 * Firebase Admin access is retained only until the remaining legacy admin
 * routes are migrated in the next cutover stage.
 */
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createSupabaseUserClient, getSupabaseAdmin } from "./supabaseAdmin";

let legacyApp: App | null = null;
export type UserRole = "user" | "counsellor" | "admin";
export const USER_ROLES: UserRole[] = ["user", "counsellor", "admin"];
export type AuthResult =
  | { status: "verified"; uid: string; token: { uid: string; email?: string; role?: UserRole } }
  | { status: "unauthenticated" }
  | { status: "unenforced" };

export function allowsUnauthenticatedDevelopment(env: { NODE_ENV?: string; ALLOW_UNAUTHENTICATED_DEV?: string } = process.env) {
  return env.NODE_ENV !== "production" && env.ALLOW_UNAUTHENTICATED_DEV === "true";
}
export function validateProductionSecurityConfig(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const errors: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) errors.push("Supabase URL, publishable key, and service-role key are required in production");
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) errors.push("CRON_SECRET must contain at least 32 characters");
  if (!env.TELEMETRY_HASH_SALT || env.TELEMETRY_HASH_SALT.length < 32) errors.push("TELEMETRY_HASH_SALT must contain at least 32 characters");
  if (!env.GEMINI_API_KEY && !env.GROQ_API_KEY) errors.push("At least one AI provider API key is required in production");
  if (env.ALLOW_UNAUTHENTICATED_DEV === "true") errors.push("ALLOW_UNAUTHENTICATED_DEV cannot be enabled in production");
  return errors;
}

function getLegacyApp(): App | null {
  if (legacyApp) return legacyApp;
  const existing = getApps(); if (existing.length) return (legacyApp = existing[0]);
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) return (legacyApp = initializeApp({ credential: cert(JSON.parse(serviceAccount)) }));
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return (legacyApp = initializeApp({ credential: applicationDefault() }));
  } catch (error) { console.error("Legacy Firebase Admin initialization failed:", error); }
  return null;
}
/** @deprecated Remaining legacy routes only; do not use in new code. */
export function getAdminDb(): Firestore | null { const app = getLegacyApp(); return app ? getFirestore(app) : null; }
/** @deprecated Remaining legacy KYC route only; do not use in new code. */
export function getAdminStorageBucket() { const app = getLegacyApp(); const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; return app && name ? getStorage(app).bucket(name) : null; }
export function isAuthEnforced() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function setUserRole(uid: string, role: UserRole) {
  const { error } = await getSupabaseAdmin().from("profiles").update({ role: role === "user" ? "member" : role }).eq("id", uid);
  if (error) throw new Error(error.message);
}
export async function getUidByEmail(email: string) { const { data, error } = await getSupabaseAdmin().from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle(); if (error) throw new Error(error.message); return data?.id || null; }
export async function deleteAuthUser(uid: string) { const { error } = await getSupabaseAdmin().auth.admin.deleteUser(uid); if (error) throw new Error(error.message); }
export function hasRole(auth: AuthResult, role: UserRole) { return auth.status === "verified" && auth.token.role === role; }

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return allowsUnauthenticatedDevelopment() ? { status: "unenforced" } : { status: "unauthenticated" };
  try {
    // Verify exactly the access token supplied by the browser. The public
    // client is intentional here: service-role credentials are for database
    // administration, not for interpreting an end-user browser session.
    const { data: authData, error: authError } = await createSupabaseUserClient(match[1]).auth.getUser(match[1]);
    if (authError || !authData.user) return { status: "unauthenticated" };
    const { data: record, error } = await getSupabaseAdmin().from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (error) {
      console.warn("Supabase profile authorization lookup failed:", error.message);
      return { status: "unauthenticated" };
    }
    // A valid Supabase identity remains authenticated even if its application
    // profile was not created by the database trigger. Role checks still fail
    // closed because the role remains undefined; bootstrap/profile recovery
    // routes can safely repair the missing row using the verified user id.
    const role = record?.role === "member" ? "user" : record?.role as UserRole | undefined;
    return { status: "verified", uid: authData.user.id, token: { uid: authData.user.id, email: authData.user.email, role } };
  } catch (error) {
    console.warn("Supabase access-token verification failed:", error);
    return { status: "unauthenticated" };
  }
}
