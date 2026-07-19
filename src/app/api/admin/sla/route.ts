import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  hasRole,
  getAdminDb,
} from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/admin/sla — crisis-lane SLA board (admin only).
 *
 * Reports the time-to-human metric over recent critical sessions: who is
 * waiting right now (with live wait times), and the avg/p90/max seconds to
 * a counsellor for handled ones. ARCHITECTURE_V2 §6 target: p90 < 10 min.
 */
export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Requires FIREBASE_SERVICE_ACCOUNT_KEY." },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  if (!hasRole(auth, "admin")) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 },
    );
  }

  try {
    const db = getAdminDb()!;
    const snapshot = await db
      .collection("sessions")
      .where("priority", "==", "critical")
      .get();

    const now = Date.now();
    const toDate = (v: unknown) =>
      v instanceof Timestamp ? v.toDate() : undefined;

    const sessions = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          state: d.state as string,
          requestedAt: toDate(d.requestedAt),
          acceptedAt: toDate(d.acceptedAt),
          counsellorId: d.counsellorId ?? null,
          counsellorName: d.counsellorName ?? null,
          timeToHumanSeconds:
            typeof d.timeToHumanSeconds === "number"
              ? d.timeToHumanSeconds
              : null,
        };
      })
      .sort(
        (a, b) =>
          (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0),
      )
      .slice(0, 100);

    const waiting = sessions
      .filter((s) => s.state === "requested" || s.state === "matched")
      .map((s) => ({
        id: s.id,
        state: s.state,
        counsellorName: s.counsellorName,
        waitingSeconds: s.requestedAt
          ? Math.round((now - s.requestedAt.getTime()) / 1000)
          : null,
      }));

    const handledTimes = sessions
      .map((s) => s.timeToHumanSeconds)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    const percentile = (p: number) =>
      handledTimes.length === 0
        ? null
        : handledTimes[
            Math.min(
              handledTimes.length - 1,
              Math.floor((p / 100) * handledTimes.length),
            )
          ];

    return NextResponse.json({
      success: true,
      data: {
        waiting,
        handledCount: handledTimes.length,
        avgSeconds:
          handledTimes.length > 0
            ? Math.round(
                handledTimes.reduce((a, b) => a + b, 0) / handledTimes.length,
              )
            : null,
        p90Seconds: percentile(90),
        maxSeconds:
          handledTimes.length > 0
            ? handledTimes[handledTimes.length - 1]
            : null,
        recent: sessions.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("SLA board query failed:", error);
    return NextResponse.json(
      { success: false, error: "SLA board query failed" },
      { status: 500 },
    );
  }
}
