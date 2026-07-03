import { NextRequest, NextResponse } from "next/server";
import {
  createCounsellorCredentialFields,
  createHealthPassportFields,
  createProofRecord,
  createWellnessRecordFields,
  getStellarAnchorPlan,
  submitProofToStellar,
} from "@/lib/stellar";
import { StellarProofKind } from "@/lib/stellar";

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function requireText(value: unknown, fieldName: string): string {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return text;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      anchorPlan: getStellarAnchorPlan(),
      submissionEnabled: Boolean(process.env.STELLAR_ISSUER_SECRET_KEY),
      network: process.env.STELLAR_NETWORK || "testnet",
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

  const submit = body.submit !== false;

  try {
    if (kind === "counsellor_credential") {
      const counsellorId = requireText(body.counsellorId, "counsellorId");
      const displayName = requireText(body.displayName, "displayName");
      const title = requireText(body.title, "title");
      const nationalId = requireText(body.nationalId, "nationalId");
      const academicQualifications = requireText(
        body.academicQualifications,
        "academicQualifications",
      );
      const professionalLicenseNumber = requireText(
        body.professionalLicenseNumber,
        "professionalLicenseNumber",
      );

      const fields = createCounsellorCredentialFields({
        counsellorId,
        displayName,
        title,
        nationalId,
        academicQualifications,
        professionalLicenseNumber,
        licenseIssuer: requireText(body.licenseIssuer || "SisterCare", "licenseIssuer"),
        verifiedBy: requireText(body.verifiedBy || "SisterCare Verification Team", "verifiedBy"),
        verificationChecklistVersion: String(
          body.verificationChecklistVersion || "v1",
        ),
        expiresAt: body.expiresAt ? String(body.expiresAt) : undefined,
      });

      const proof = createProofRecord(kind, fields, {
        memo: `counsellor:${fields.counsellorId}`,
        submittedAt: new Date().toISOString(),
      });

      if (!submit) {
        return NextResponse.json({ success: true, data: { proof, fields } });
      }

      const submission = await submitProofToStellar(proof);

      return NextResponse.json({
        success: true,
        data: {
          proof: submission.proof,
          fields,
          submission,
        },
      });
    }

    if (kind === "health_passport") {
      const passportId = requireText(body.passportId, "passportId");
      const userId = requireText(body.userId, "userId");
      const merkleRoot = requireText(body.merkleRoot, "merkleRoot");

      const fields = createHealthPassportFields({
        passportId,
        userId,
        recordScope: Array.isArray(body.recordScope)
          ? body.recordScope
          : ["period", "symptom", "mood", "session"],
        recordCount: Number(body.recordCount || 0),
        merkleRoot,
        consentVersion: String(body.consentVersion || "v1"),
        issuer: requireText(body.issuer || "SisterCare", "issuer"),
        subjectVersion: String(body.subjectVersion || "v1"),
        lastAnchorAt: body.lastAnchorAt ? String(body.lastAnchorAt) : undefined,
      });

      const proof = createProofRecord(kind, fields, {
        memo: `passport:${fields.passportId}`,
        submittedAt: new Date().toISOString(),
      });

      if (!submit) {
        return NextResponse.json({ success: true, data: { proof, fields } });
      }

      const submission = await submitProofToStellar(proof);

      return NextResponse.json({
        success: true,
        data: {
          proof: submission.proof,
          fields,
          submission,
        },
      });
    }

    if (kind === "wellness_record") {
      const recordId = requireText(body.recordId, "recordId");
      const userId = requireText(body.userId, "userId");
      const recordType = requireText(body.recordType, "recordType") as
        | "period_log"
        | "symptom_log"
        | "mood_log"
        | "session_note";
      const sourceCollection = requireText(
        body.sourceCollection,
        "sourceCollection",
      );

      const fields = createWellnessRecordFields({
        recordId,
        userId,
        recordType,
        sourceCollection,
        record: body.record || {},
        issuer: requireText(body.issuer || "SisterCare", "issuer"),
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

      if (!submit) {
        return NextResponse.json({ success: true, data: { proof, fields } });
      }

      const submission = await submitProofToStellar(proof);

      return NextResponse.json({
        success: true,
        data: {
          proof: submission.proof,
          fields,
          submission,
        },
      });
    }

    return badRequest("Unsupported proof kind.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required field:")) {
      return badRequest(error.message);
    }

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
