import { NextResponse } from "next/server";
import {
  isAuthEnforced,
  validateProductionSecurityConfig,
} from "@/lib/firebaseAdmin";

export async function GET() {
  const securityErrors = validateProductionSecurityConfig();
  const ready = securityErrors.length === 0 && isAuthEnforced();

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "sistercare",
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
