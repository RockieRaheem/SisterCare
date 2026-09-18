# SisterCare Clinical Safety Review

Status: engineering controls implemented; independent clinical approval pending

SisterCare must not be released as a public clinical service merely because its automated tests pass. Engineering can prove that safety controls execute as designed. Only qualified, independent reviewers can decide whether the underlying health rules, wording and referral pathways are clinically and culturally appropriate.

## Review team required

- a clinician licensed to practise in Uganda, independent of the code author;
- a safeguarding professional experienced in suicide, abuse and gender-based violence response;
- one competent native-language reviewer for each public language: English, Luganda, Acholi, Lugbara, Runyankole, Ateso and Swahili;
- a SisterCare owner who records decisions and ensures rejected material is not released.

The same person may cover more than one language only when their competence is documented. A developer must never approve their own clinical rule.

## Material to review

1. Every entry and exact version in `src/lib/clinicalGovernance.ts`.
2. The post-generation rules in `src/lib/medicalSafety.ts`.
3. Every case in `src/lib/medicalSafetyEvaluation.ts`, including natural local-language variants, spelling mistakes, code-switching and voice-transcription errors supplied by reviewers.
4. Crisis classification and response wording in `src/lib/safety.ts`.
5. Doctor referral, emergency warning and prescription interfaces.
6. Uganda referral details and what happens when no professional is available.

## Approval evidence

For each governed item, retain outside the public repository:

- reviewer name, professional registration and verification evidence;
- item id and exact version reviewed;
- languages reviewed;
- date, decision, required corrections and next review date;
- signed approval or traceable organisational approval record.

Only after corrections and sign-off should an operator create the server-only `CLINICAL_APPROVALS_JSON` value described in the README. Never invent a reviewer or copy the example name from a test. Any content or rule version change invalidates the old attestation.

## Release and incident rule

`GET /api/health` must continue returning `clinicalGovernance:false` until all current versions have valid attestations. A prohibited medical output, missed red flag, incorrect referral, mistranslation or complaint about harmful advice opens an incident. The safety owner must acknowledge it, protect affected users, preserve privacy-safe evidence, pause the affected feature when necessary, document corrective action and require fresh review before reopening it.
