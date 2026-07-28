import { NextResponse } from "next/server";
import {
  isAuthEnforced,
  validateProductionSecurityConfig,
} from "@/lib/firebaseAdmin";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import { getMaintenanceReadiness } from "@/lib/server/operations";

export async function GET() {
  const securityErrors = validateProductionSecurityConfig();
  const clinicalIssues = getClinicalRuntimeIssues();
  const maintenanceReady = await getMaintenanceReadiness();
  const ready = securityErrors.length === 0 && clinicalIssues.length === 0 && maintenanceReady && isAuthEnforced();

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "sistercare",
      checks: {
        security: securityErrors.length === 0,
        clinicalGovernance: clinicalIssues.length === 0,
        maintenance: maintenanceReady,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
