import { NextResponse } from "next/server";
import {
  isAuthEnforced,
  validateProductionSecurityConfig,
} from "@/lib/firebaseAdmin";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";

export async function GET() {
  const securityErrors = validateProductionSecurityConfig();
  const clinicalIssues = getClinicalRuntimeIssues();
  const ready = securityErrors.length === 0 && clinicalIssues.length === 0 && isAuthEnforced();

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "sistercare",
      checks: {
        security: securityErrors.length === 0,
        clinicalGovernance: clinicalIssues.length === 0,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
