import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  setUserRole,
  getUidByEmail,
  getAdminDb,
  hasRole,
  USER_ROLES,
  type UserRole,
} from "@/lib/firebaseAdmin";

/**
 * POST /api/admin/roles — assign a role (user | counsellor | admin).
 *
 * Authorization, in order:
 *   1. A verified caller whose token carries role=admin.
 *   2. The ADMIN_BOOTSTRAP_SECRET header (x-admin-bootstrap-secret) — exists
 *      solely to grant the FIRST admin on a fresh deployment; rotate or unset
 *      the secret afterwards.
 *
 * This endpoint cannot run in unenforced dev mode: granting roles without a
 * configured Admin SDK is meaningless (claims live in Firebase Auth).
 *
 * Body: { role: UserRole, uid?: string, email?: string }  (uid or email)
 */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Role management requires FIREBASE_SERVICE_ACCOUNT_KEY to be configured.",
      },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get("x-admin-bootstrap-secret");
  const isBootstrap = Boolean(
    bootstrapSecret && providedSecret === bootstrapSecret,
  );

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const role = body.role as UserRole;
  if (!USER_ROLES.includes(role)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid role. Expected one of: ${USER_ROLES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  let uid: string | null =
    typeof body.uid === "string" && body.uid.trim() ? body.uid.trim() : null;
  if (!uid && typeof body.email === "string" && body.email.trim()) {
    uid = await getUidByEmail(body.email.trim());
    if (!uid) {
      return NextResponse.json(
        { success: false, error: "No user found with that email" },
        { status: 404 },
      );
    }
  }
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Provide uid or email" },
      { status: 400 },
    );
  }

  const isExistingAdmin = hasRole(auth, "admin");
  if (!isExistingAdmin) {
    // The secret is only a second factor for the signed-in person claiming
    // their own first-admin account. It can never bootstrap another uid.
    if (!isBootstrap || auth.status !== "verified" || role !== "admin" || uid !== auth.uid) {
      return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
    }
    const claim = getAdminDb()!.collection("system").doc("admin-bootstrap");
    try {
      await getAdminDb()!.runTransaction(async (transaction) => {
        const current = await transaction.get(claim);
        if (current.exists && current.data()?.uid !== auth.uid) throw new Error("BOOTSTRAP_ALREADY_USED");
        transaction.set(claim, { uid: auth.uid, claimedAt: new Date(), state: "claiming" }, { merge: true });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "BOOTSTRAP_ALREADY_USED") return NextResponse.json({ success: false, error: "The administrator bootstrap has already been claimed" }, { status: 409 });
      throw error;
    }
  }

  try {
    await setUserRole(uid, role);
    if (!isExistingAdmin) await getAdminDb()!.collection("system").doc("admin-bootstrap").set({ state: "complete", completedAt: new Date() }, { merge: true });
    return NextResponse.json({
      success: true,
      data: {
        uid,
        role,
        note: "Role takes effect when the user's ID token refreshes (≤1h) or on next login.",
        grantedVia: !isExistingAdmin ? "bootstrap" : "admin",
      },
    });
  } catch (error) {
    console.error("Failed to set user role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set role" },
      { status: 500 },
    );
  }
}
