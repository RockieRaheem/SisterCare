export type StellarProofKind =
  | "counsellor_credential"
  | "health_passport"
  | "wellness_record";

export type StellarProofStatus = "pending" | "anchored" | "verified" | "revoked";

export interface StellarAnchorMetadata {
  networkPassphrase?: string;
  txHash?: string;
  ledger?: number;
  memo?: string;
  submittedAt?: string;
}

export interface CounsellorVerificationFields {
  counsellorId: string;
  displayName: string;
  title: string;
  nationalIdHash: string;
  academicQualificationHash: string;
  professionalLicenseNumberHash: string;
  licenseIssuer: string;
  verificationChecklistVersion: string;
  verifiedBy: string;
  verifiedAt: string;
  expiresAt?: string;
  status: "verified" | "expired" | "revoked";
}

export interface HealthPassportFields {
  passportId: string;
  userIdHash: string;
  subjectVersion: string;
  recordScope: Array<"period" | "symptom" | "mood" | "session" | "counsellor_note">;
  recordCount: number;
  merkleRoot: string;
  lastAnchorAt: string;
  consentVersion: string;
  issuer: string;
}

export interface WellnessRecordFields {
  recordId: string;
  userIdHash: string;
  recordType: "period_log" | "symptom_log" | "mood_log" | "session_note";
  sourceCollection: string;
  recordHash: string;
  previousRecordHash?: string;
  recordedAt: string;
  schemaVersion: string;
  issuer: string;
}

export interface StellarProofRecord<TFields = Record<string, unknown>> {
  proofId: string;
  kind: StellarProofKind;
  status: StellarProofStatus;
  anchor: {
    payloadHash: string;
    fields: TFields;
    metadata: StellarAnchorMetadata;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProofVerificationInput {
  kind: StellarProofKind;
  fields: Record<string, unknown>;
  payloadHash: string;
}

export interface ProofVerificationResult {
  valid: boolean;
  reason?: string;
  expectedHash?: string;
}

export interface BlockchainAnchorPlan {
  dataLayer: string;
  onChainLayer: string;
  issuerAccountModel: string;
  revocationStrategy: string;
}
