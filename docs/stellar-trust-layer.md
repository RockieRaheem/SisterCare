# SisterCare Stellar Trust Layer

## Goal

Use Stellar as a trust and integrity layer, not as a payments system.

The product keeps all sensitive health data in Firebase or encrypted storage. Stellar stores only cryptographic proofs, verification metadata, and revocation references.

## Why Stellar Fits SisterCare

- Counsellor credentials need independent verification.
- Health histories need portability without exposing private medical data.
- Wellness logs need tamper evidence.
- The network should not be used for payments in this deployment.

## Exact Data Fields To Anchor On Stellar

### 1. Counsellor Credentials

Anchor these fields on-chain as a proof payload:

- `counsellorId`
- `displayName`
- `title`
- `nationalIdHash`
- `academicQualificationHash`
- `professionalLicenseNumberHash`
- `licenseIssuer`
- `verificationChecklistVersion`
- `verifiedBy`
- `verifiedAt`
- `expiresAt` when applicable
- `status`

Keep off-chain in Firebase:

- Raw national ID number
- Raw academic certificates
- Raw license document images
- Review notes and manual audit comments
- Reverification attachments

Recommended Stellar anchor metadata:

- `proofId`
- `payloadHash`
- `memo = counsellor:<counsellorId>`
- `txHash`
- `ledger`
- `submittedAt`

### 2. Portable Health Passport

Anchor these fields on-chain as a user-owned proof:

- `passportId`
- `userIdHash`
- `subjectVersion`
- `recordScope`
- `recordCount`
- `merkleRoot`
- `lastAnchorAt`
- `consentVersion`
- `issuer`

Keep off-chain in Firebase:

- Full cycle history
- Symptom logs
- Mood logs
- Counselling notes
- Session transcripts
- Any personally identifiable data

Recommended Stellar anchor metadata:

- `proofId`
- `payloadHash`
- `memo = passport:<passportId>`
- `txHash`
- `ledger`
- `submittedAt`

### 3. Tamper-Proof Wellness Records

Anchor these fields on-chain per record or per batch root:

- `recordId`
- `userIdHash`
- `recordType`
- `sourceCollection`
- `recordHash`
- `previousRecordHash` when chain-of-custody is needed
- `recordedAt`
- `schemaVersion`
- `issuer`

Keep off-chain in Firebase:

- The actual record body
- Clinical notes
- Free-text observations
- Sensitive attached files

Recommended Stellar anchor metadata:

- `proofId`
- `payloadHash`
- `memo = record:<recordId>`
- `txHash`
- `ledger`
- `submittedAt`

## User Flows

### A. Counsellor Verification Flow

1. Admin creates a counsellor application in SisterCare.
2. Staff verify National ID, academic records, and professional license.
3. SisterCare converts the raw evidence into hashed verification inputs.
4. SisterCare signs a proof request with the issuer account.
5. Backend creates a Stellar proof payload.
6. Proof is anchored on Stellar.
7. Counsellor profile shows:
   - Identity Verified
   - Professional License Verified
   - Verified by SisterCare
8. If a licence expires or is revoked, SisterCare updates the counsellor record and publishes a revocation proof.

### B. Portable Health Passport Flow

1. User opts in to a portable passport.
2. SisterCare groups the user's supported records into a Merkle tree.
3. A passport root is created from the record hashes.
4. Backend anchors the passport proof on Stellar.
5. User can export the passport to another clinician or platform.
6. The recipient verifies the proof against Stellar and confirms the history belongs to the user without reading private data from chain.

### C. Wellness Record Integrity Flow

1. User logs a symptom, mood, or period entry.
2. SisterCare stores the private record in Firebase.
3. Backend hashes the record payload.
4. The hash is anchored on Stellar either immediately or as a batch root.
5. Later, any auditor can recompute the hash and confirm the entry has not changed.

## Backend Implementation Plan

### Layer 1: Data Capture

- Firebase stores all private records.
- SisterCare computes a stable canonical payload for the proof fields.
- Record IDs and user IDs are hashed before anchoring.

### Layer 2: Proof Construction

- A server-side proof service creates the payload hash.
- The service builds one of three proof kinds:
  - counsellor credential
  - health passport
  - wellness record
- The service optionally adds memo text and anchor metadata.

### Layer 3: Stellar Submission

- A dedicated issuer account submits the anchor transaction.
- For sensitive operations, use multisig approval.
- Add time bounds so proofs cannot be replayed indefinitely.
- Keep chain activity limited to verification events, not live data.

### Layer 4: Verification

- A verification endpoint recomputes the payload hash from the stored fields.
- If the hash matches, the proof is valid.
- The client shows a human-readable status badge.
- Revocation state is checked separately from payload integrity.

### Layer 5: Revocation

- Credentials can be revoked or expired without removing history.
- A revoked credential remains historically verifiable.
- SisterCare displays the current status as revoked/expired.

## API Surface Added

### `GET /api/stellar/proofs`

Returns the supported proof kinds and the anchor plan.

### `POST /api/stellar/proofs`

Builds a proof record for:
- `counsellor_credential`
- `health_passport`
- `wellness_record`

### `POST /api/stellar/verify`

Verifies that the provided fields match the anchored payload hash.

## Recommended Release Strategy

1. Launch counsellor verification first.
2. Add tamper-proof wellness records next.
3. Add portable health passport export after user testing.
4. Add revocation and audit UI last.

## Important Product Rules

- Never store raw medical data on Stellar.
- Never use the chain for payments in this deployment.
- Always keep user consent in the app before generating a passport proof.
- Treat Stellar as a public proof layer and Firebase as the private data source.
