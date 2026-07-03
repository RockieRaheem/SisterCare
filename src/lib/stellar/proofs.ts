import { createHash } from "crypto";
import {
  BlockchainAnchorPlan,
  CounsellorVerificationFields,
  HealthPassportFields,
  ProofVerificationInput,
  ProofVerificationResult,
  StellarAnchorMetadata,
  StellarProofKind,
  StellarProofRecord,
  WellnessRecordFields,
} from "./types";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue(
          (value as Record<string, unknown>)[key],
        );
        return accumulator;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashObject(value: unknown): string {
  return sha256Hex(stableStringify(value));
}

export function buildPayloadHash(
  kind: StellarProofKind,
  fields: Record<string, unknown>,
): string {
  return hashObject({ kind, fields });
}

export function createProofRecord<TFields extends Record<string, unknown>>(
  kind: StellarProofKind,
  fields: TFields,
  metadata: StellarAnchorMetadata = {},
  status: StellarProofRecord<TFields>["status"] = "pending",
): StellarProofRecord<TFields> {
  const now = new Date().toISOString();
  const payloadHash = buildPayloadHash(kind, fields);

  return {
    proofId: sha256Hex(`${kind}:${payloadHash}:${now}`),
    kind,
    status,
    anchor: {
      payloadHash,
      fields,
      metadata,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function verifyProof({
  kind,
  fields,
  payloadHash,
}: ProofVerificationInput): ProofVerificationResult {
  const expectedHash = buildPayloadHash(kind, fields);

  if (expectedHash !== payloadHash) {
    return {
      valid: false,
      reason: "payload_hash_mismatch",
      expectedHash,
    };
  }

  return {
    valid: true,
    expectedHash,
  };
}

export function createCounsellorCredentialFields(input: {
  counsellorId: string;
  displayName: string;
  title: string;
  nationalId: string;
  academicQualifications: string;
  professionalLicenseNumber: string;
  licenseIssuer: string;
  verifiedBy: string;
  verificationChecklistVersion?: string;
  expiresAt?: string;
}): CounsellorVerificationFields {
  return {
    counsellorId: input.counsellorId,
    displayName: input.displayName,
    title: input.title,
    nationalIdHash: sha256Hex(input.nationalId.trim().toLowerCase()),
    academicQualificationHash: sha256Hex(
      input.academicQualifications.trim().toLowerCase(),
    ),
    professionalLicenseNumberHash: sha256Hex(
      input.professionalLicenseNumber.trim().toLowerCase(),
    ),
    licenseIssuer: input.licenseIssuer,
    verificationChecklistVersion: input.verificationChecklistVersion || "v1",
    verifiedBy: input.verifiedBy,
    verifiedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    status: "verified",
  };
}

export function createHealthPassportFields(input: {
  passportId: string;
  userId: string;
  recordScope: HealthPassportFields["recordScope"];
  recordCount: number;
  merkleRoot: string;
  consentVersion?: string;
  issuer: string;
  subjectVersion?: string;
  lastAnchorAt?: string;
}): HealthPassportFields {
  return {
    passportId: input.passportId,
    userIdHash: sha256Hex(input.userId.trim().toLowerCase()),
    subjectVersion: input.subjectVersion || "v1",
    recordScope: input.recordScope,
    recordCount: input.recordCount,
    merkleRoot: input.merkleRoot,
    lastAnchorAt: input.lastAnchorAt || new Date().toISOString(),
    consentVersion: input.consentVersion || "v1",
    issuer: input.issuer,
  };
}

export function createWellnessRecordFields(input: {
  recordId: string;
  userId: string;
  recordType: WellnessRecordFields["recordType"];
  sourceCollection: string;
  record: Record<string, unknown>;
  issuer: string;
  previousRecordHash?: string;
  schemaVersion?: string;
  recordedAt?: string;
}): WellnessRecordFields {
  return {
    recordId: input.recordId,
    userIdHash: sha256Hex(input.userId.trim().toLowerCase()),
    recordType: input.recordType,
    sourceCollection: input.sourceCollection,
    recordHash: hashObject(input.record),
    previousRecordHash: input.previousRecordHash,
    recordedAt: input.recordedAt || new Date().toISOString(),
    schemaVersion: input.schemaVersion || "v1",
    issuer: input.issuer,
  };
}

export function buildMerkleRoot(values: string[]): string {
  if (values.length === 0) {
    return sha256Hex("empty-tree");
  }

  let level = values.map((value) => sha256Hex(value));

  while (level.length > 1) {
    const nextLevel: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] || left;
      nextLevel.push(sha256Hex(`${left}:${right}`));
    }

    level = nextLevel;
  }

  return level[0];
}

export function getStellarAnchorPlan(): BlockchainAnchorPlan {
  return {
    dataLayer:
      "Firebase stores encrypted health, counsellor, and session records; Stellar stores only proof hashes and verification metadata.",
    onChainLayer:
      "Stellar anchors proofs for counsellor credentials, health passport attestations, and tamper-proof wellness logs.",
    issuerAccountModel:
      "A SisterCare issuer account, protected by multisig, signs verification events and proof anchors.",
    revocationStrategy:
      "Revoked or expired credentials remain verifiable historically but are marked invalid in SisterCare and mirrored via a revocation proof.",
  };
}
