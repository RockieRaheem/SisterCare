import { NextRequest, NextResponse } from "next/server";
import { verifyProof } from "@/lib/stellar";

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON payload.");
  }

  const kind = body.kind;
  const fields = body.fields;
  const payloadHash = body.payloadHash;

  if (!kind || !fields || !payloadHash) {
    return badRequest("Missing kind, fields, or payloadHash.");
  }

  const result = verifyProof({
    kind,
    fields,
    payloadHash,
  });

  return NextResponse.json({
    success: true,
    data: result,
  });
}
