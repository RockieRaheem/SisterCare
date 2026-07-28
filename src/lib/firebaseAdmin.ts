/**
 * Firebase Admin SDK — SERVER-SIDE ONLY. Never import from client components.
 *
 * This is the trust boundary for API routes: verifyIdToken() proves who the
 * caller is, so routes act on the VERIFIED uid instead of trusting whatever
 * userId the request body claims.
 *
 * Configuration (either one):
 *   FIREBASE_SERVICE_ACCOUNT_KEY  — the service account JSON, as a string
 *   GOOGLE_APPLICATION_CREDENTIALS — path to the JSON file (standard ADC)
 *
 * Authentication fails closed unless a developer explicitly sets
 * ALLOW_UNAUTHENTICATED_DEV=true outside production.
 */

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | null = null;
let warnedUnconfigured = false;

export function allowsUnauthenticatedDevelopment(
  env: {
    NODE_ENV?: string;
    ALLOW_UNAUTHENTICATED_DEV?: string;
  } = process.env,
): boolean {
  return (
    env.NODE_ENV !== "production" &&
    env.ALLOW_UNAUTHENTICATED_DEV === "true"
  );
}

export function validateProductionSecurityConfig(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (env.NODE_ENV !== "production") return [];

  const errors: string[] = [];
  if (
    !env.FIREBASE_SERVICE_ACCOUNT_KEY &&
    !env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    errors.push("Firebase Admin credentials are required in production");
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) {
    errors.push("CRON_SECRET must contain at least 32 characters");
  }
  if (!env.TELEMETRY_HASH_SALT || env.TELEMETRY_HASH_SALT.length < 32) {
    errors.push("TELEMETRY_HASH_SALT must contain at least 32 characters");
  }
  if (!env.GEMINI_API_KEY && !env.GROQ_API_KEY) {
    errors.push("At least one AI provider API key is required in production");
  }
  if (env.ALLOW_UNAUTHENTICATED_DEV === "true") {
    errors.push("ALLOW_UNAUTHENTICATED_DEV cannot be enabled in production");
  }
  return errors;
}

function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      adminApp = initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({ credential: applicationDefault() });
    } else {
      if (!warnedUnconfigured) {
        console.warn(
          "[auth] Firebase Admin is not configured. Protected APIs fail " +
            "closed unless ALLOW_UNAUTHENTICATED_DEV=true is explicitly set.",
        );
        warnedUnconfigured = true;
      }
      return null;
    }
    return adminApp;
  } catch (error) {
    console.error("[auth] Failed to initialize Firebase Admin:", error);
    return null;
  }
}

export function isAuthEnforced(): boolean {
  return getAdminApp() !== null;
}

/**
 * Admin Firestore instance, or null when the Admin SDK isn't configured.
 * Admin access bypasses security rules — server code using it MUST act only
 * on identities proven by authenticateRequest().
 */
export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

/** Private Storage bucket for server-authorized KYC document access. */
export function getAdminStorageBucket() {
  const app = getAdminApp();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return app && bucketName ? getStorage(app).bucket(bucketName) : null;
}

export type AuthResult =
  | { status: "verified"; uid: string; token: DecodedIdToken }
  | { status: "unauthenticated" }
  | { status: "unenforced" };

// ============================================
// ROLES (custom claims)
// ============================================

export type UserRole = "user" | "counsellor" | "admin";

export const USER_ROLES: UserRole[] = ["user", "counsellor", "admin"];

/**
 * Set a user's role as a custom claim. Server-only, admin-gated at the API
 * layer. Takes effect when the user's ID token next refreshes (≤1 hour, or
 * immediately on re-login).
 */
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  const app = getAdminApp();
  if (!app) {
    throw new Error("Firebase Admin is not configured — cannot set roles");
  }
  await getAuth(app).setCustomUserClaims(uid, { role });
}

/** Resolve a uid from an email address, or null if no such user. */
export async function getUidByEmail(email: string): Promise<string | null> {
  const app = getAdminApp();
  if (!app) {
    throw new Error("Firebase Admin is not configured — cannot look up users");
  }
  try {
    const user = await getAuth(app).getUserByEmail(email);
    return user.uid;
  } catch {
    return null;
  }
}

export async function deleteAuthUser(uid: string): Promise<void> {
  const app = getAdminApp();
  if (!app) {
    throw new Error("Firebase Admin is not configured — cannot delete user");
  }
  await getAuth(app).deleteUser(uid);
}

/** True when the request is verified AND carries the given role claim. */
export function hasRole(auth: AuthResult, role: UserRole): boolean {
  return auth.status === "verified" && auth.token.role === role;
}

/**
 * Authenticate an incoming API request from its Authorization header.
 *
 * - "verified"        → valid Firebase ID token; use `uid` as the identity
 *                       and ignore any client-supplied userId.
 * - "unauthenticated" → enforcement is on and the token is missing/invalid;
 *                       the route must return 401.
 * - "unenforced"      → explicit non-production escape hatch only; the route
 *                       may fall back to the client-supplied identity.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthResult> {
  const app = getAdminApp();
  if (!app) {
    return allowsUnauthenticatedDevelopment()
      ? { status: "unenforced" }
      : { status: "unauthenticated" };
  }

  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { status: "unauthenticated" };

  try {
    const token = await getAuth(app).verifyIdToken(match[1]);
    return { status: "verified", uid: token.uid, token };
  } catch (error) {
    console.warn("[auth] ID token verification failed:", error);
    return { status: "unauthenticated" };
  }
}
