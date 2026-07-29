import { NextResponse } from "next/server";
import {
  isAuthEnforced,
  validateProductionSecurityConfig,
} from "@/lib/serverAuth";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import {
  getDatabaseReadiness,
  getMaintenanceReadiness,
} from "@/lib/server/operations";

export async function GET() {
  const securityErrors = validateProductionSecurityConfig();
  const clinicalIssues = getClinicalRuntimeIssues();
  const [databaseReady, maintenanceReady] = await Promise.all([
    getDatabaseReadiness(),
    getMaintenanceReadiness(),
  ]);
  const ready =
    securityErrors.length === 0 &&
    clinicalIssues.length === 0 &&
    databaseReady &&
    maintenanceReady &&
    isAuthEnforced();

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "sistercare",
      checks: {
        security: securityErrors.length === 0,
        database: databaseReady,
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
