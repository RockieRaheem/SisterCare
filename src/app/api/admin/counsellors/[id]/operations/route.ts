import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  hasRole,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const VERIFICATION_STATES = [
  "pending",
  "verified",
  "suspended",
  "expired",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Counsellor operations are unavailable" },
      { status: 503 },
    );
  }
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }
  const verificationStatus = String(body.verificationStatus || "");
  if (
    !VERIFICATION_STATES.includes(
      verificationStatus as (typeof VERIFICATION_STATES)[number],
    )
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid verification status" },
      { status: 400 },
    );
  }
  const maxConcurrentSessions = Number(body.maxConcurrentSessions);
  if (
    !Number.isInteger(maxConcurrentSessions) ||
    maxConcurrentSessions < 1 ||
    maxConcurrentSessions > 10
  ) {
    return NextResponse.json(
      { success: false, error: "Capacity must be between 1 and 10" },
      { status: 400 },
    );
  }
  const credentialExpiresAt = new Date(String(body.credentialExpiresAt || ""));
  if (Number.isNaN(credentialExpiresAt.getTime())) {
    return NextResponse.json(
      { success: false, error: "A valid credential expiry is required" },
      { status: 400 },
    );
  }
  const availableHours = body.availableHours as
    | { start?: unknown; end?: unknown; days?: unknown }
    | undefined;
  const validTime = (value: unknown) =>
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (
    !availableHours ||
    !validTime(availableHours.start) ||
    !validTime(availableHours.end) ||
    !Array.isArray(availableHours.days) ||
    availableHours.days.length === 0 ||
    !availableHours.days.every((day) => typeof day === "string")
  ) {
    return NextResponse.json(
      { success: false, error: "A valid shift schedule is required" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const db = getAdminDb()!;
  const ref = db.collection("counsellors").doc(id);
  if (!(await ref.get()).exists) {
    return NextResponse.json(
      { success: false, error: "Counsellor not found" },
      { status: 404 },
    );
  }

  await ref.update({
    verificationStatus,
    verified: verificationStatus === "verified",
    credentialExpiresAt: Timestamp.fromDate(credentialExpiresAt),
    maxConcurrentSessions,
    acceptingNewSessions: body.acceptingNewSessions === true,
    crisisTrained: body.crisisTrained === true,
    supervisorId:
      typeof body.supervisorId === "string" && body.supervisorId.trim()
        ? body.supervisorId.trim()
        : FieldValue.delete(),
    availableHours: {
      start: availableHours.start,
      end: availableHours.end,
      days: availableHours.days,
    },
    verificationUpdatedAt: FieldValue.serverTimestamp(),
    verificationUpdatedBy: auth.uid,
  });

  if (verificationStatus !== "verified") {
    await db.collection("presence").doc(id).set(
      {
        status: "offline",
        lastHeartbeat: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await db.collection("events").add({
    type: "counsellor.verification_changed",
    payload: {
      counsellorId: id,
      verificationStatus,
      changedBy: auth.uid,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
