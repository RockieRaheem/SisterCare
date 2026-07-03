import { NextRequest, NextResponse } from "next/server";
import {
  createCounsellorCredentialFields,
  createHealthPassportFields,
  createProofRecord,
  createWellnessRecordFields,
  getStellarAnchorPlan,
} from "@/lib/stellar";
import { StellarProofKind } from "@/lib/stellar";

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      anchorPlan: getStellarAnchorPlan(),
      supportedKinds: [
        "counsellor_credential",
        "health_passport",
        "wellness_record",
      ] satisfies StellarProofKind[],
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON payload.");
  }

  const kind = body.kind as StellarProofKind | undefined;
  if (!kind) {
    return badRequest("Missing proof kind.");
  }

  try {
    if (kind === "counsellor_credential") {
      const fields = createCounsellorCredentialFields({
        counsellorId: String(body.counsellorId || ""),
        displayName: String(body.displayName || ""),
        title: String(body.title || ""),
        nationalId: String(body.nationalId || ""),
        academicQualifications: String(body.academicQualifications || ""),
        professionalLicenseNumber: String(body.professionalLicenseNumber || ""),
        licenseIssuer: String(body.licenseIssuer || "SisterCare"),
        verifiedBy: String(body.verifiedBy || "SisterCare Verification Team"),
        verificationChecklistVersion: String(
          body.verificationChecklistVersion || "v1",
        ),
        expiresAt: body.expiresAt ? String(body.expiresAt) : undefined,
      });

      const proof = createProofRecord(kind, fields, {
        memo: `counsellor:${fields.counsellorId}`,
        submittedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { proof, fields } });
    }

    if (kind === "health_passport") {
      const fields = createHealthPassportFields({
        passportId: String(body.passportId || ""),
        userId: String(body.userId || ""),
        recordScope: Array.isArray(body.recordScope)
          ? body.recordScope
          : ["period", "symptom", "mood", "session"],
        recordCount: Number(body.recordCount || 0),
        merkleRoot: String(body.merkleRoot || ""),
        consentVersion: String(body.consentVersion || "v1"),
        issuer: String(body.issuer || "SisterCare"),
        subjectVersion: String(body.subjectVersion || "v1"),
        lastAnchorAt: body.lastAnchorAt ? String(body.lastAnchorAt) : undefined,
      });

      const proof = createProofRecord(kind, fields, {
        memo: `passport:${fields.passportId}`,
        submittedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { proof, fields } });
    }

    if (kind === "wellness_record") {
      const fields = createWellnessRecordFields({
        recordId: String(body.recordId || ""),
        userId: String(body.userId || ""),
        recordType: body.recordType,
        sourceCollection: String(body.sourceCollection || ""),
        record: body.record || {},
        issuer: String(body.issuer || "SisterCare"),
        previousRecordHash: body.previousRecordHash
          ? String(body.previousRecordHash)
          : undefined,
        schemaVersion: String(body.schemaVersion || "v1"),
        recordedAt: body.recordedAt ? String(body.recordedAt) : undefined,
      });

      const proof = createProofRecord(kind, fields, {
        memo: `record:${fields.recordId}`,
        submittedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { proof, fields } });
    }

    return badRequest("Unsupported proof kind.");
  } catch (error) {
    console.error("Failed to build Stellar proof:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to build Stellar proof.",
      },
      { status: 500 },
    );
  }
}
