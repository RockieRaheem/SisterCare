import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import { withApiObservability } from "@/lib/observability";
import {
  getDatabaseReadinessReport,
  getMaintenanceReadinessReport,
  getSafetyCoverageReadiness,
} from "@/lib/server/operations";

async function getReadiness(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Administrator diagnostics are unavailable" },
      { status: 503 },
    );
  }
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth, "admin");
  if (failure) {
    return NextResponse.json(
      { success: false, error: failure.error },
      { status: failure.status },
    );
  }

  const [database, maintenance, safetyCoverage] = await Promise.all([
    getDatabaseReadinessReport(),
    getMaintenanceReadinessReport(),
    getSafetyCoverageReadiness(),
  ]);
  const clinicalIssues = getClinicalRuntimeIssues().map(({ id, code }) => ({
    id,
    code,
  }));
  return NextResponse.json(
    {
      success: true,
      data: {
        database,
        maintenance,
        safetyCoverage,
        clinicalIssues,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const GET = withApiObservability("admin_readiness_get", getReadiness);
