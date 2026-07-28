# Clinical Governance Release Gate

SisterCare must not present health or crisis guidance to public production users
until a qualified, named clinical or safeguarding reviewer has approved every
governed content item. Engineering approval is not clinical approval.

## Production configuration

Set `CLINICAL_APPROVALS_JSON` as a **sensitive Production-only** Vercel
environment variable. It must be a JSON array with one current record for each
content identifier in `src/lib/clinicalGovernance.ts`:

```json
[
  {
    "id": "menstrual-cycle-basics",
    "version": "1.0.0",
    "reviewedBy": "Dr Example Name, licence/registration number",
    "reviewedAt": "2026-07-29",
    "reviewDueAt": "2027-07-29"
  }
]
```

The reviewer must confirm the content version, local emergency resources,
medical escalation wording, and every published language. The release gate
rejects missing, duplicate, expired, malformed, or version-mismatched records.

## Required operating practice

1. Keep signed review evidence outside the application in the approved clinical
   governance repository.
2. Create a new content version for any material medical, safety, or translation
   change; obtain a new attestation before deployment.
3. Review critical crisis material at least quarterly and routine health content
   at least annually.
4. Check `/api/health` after each deployment. It must return `200` and both
   `security` and `clinicalGovernance` must be `true` before public launch.
