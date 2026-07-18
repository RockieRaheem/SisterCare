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
 * If neither is set, auth runs in "unenforced" mode: requests are allowed
 * through with a loud warning so a dev checkout still works. Production
 * deployments MUST configure one of the above.
 */

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

let adminApp: App | null = null;
let warnedUnconfigured = false;

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
          "[auth] Firebase Admin is NOT configured — API authentication is " +
            "not enforced. Set FIREBASE_SERVICE_ACCOUNT_KEY before deploying " +
            "to production.",
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

export type AuthResult =
  | { status: "verified"; uid: string; token: DecodedIdToken }
  | { status: "unauthenticated" }
  | { status: "unenforced" };

/**
 * Authenticate an incoming API request from its Authorization header.
 *
 * - "verified"        → valid Firebase ID token; use `uid` as the identity
 *                       and ignore any client-supplied userId.
 * - "unauthenticated" → enforcement is on and the token is missing/invalid;
 *                       the route must return 401.
 * - "unenforced"      → Admin SDK not configured (dev mode); the route may
 *                       fall back to the client-supplied identity.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthResult> {
  const app = getAdminApp();
  if (!app) return { status: "unenforced" };

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
