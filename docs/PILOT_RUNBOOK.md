# SisterCare Controlled Pilot Runbook

Status: operational checklist for the adult-only controlled pilot  
Owner: assign before launch  
Last updated: 19 August 2026

## 1. Pilot boundary

This is a small, supervised product test, not a public launch. Recruit only named participants aged 18 or older. Do not advertise open registration, enrol minors, promise clinical treatment, or describe Sister as a therapist. Keep menstrual tracking available, but evaluate the main promise: a private, non-judgmental path to emotional support and verified human care.

Suggested first cohort: 8–15 participants for 3–7 days, with one trained pilot coordinator and at least one verified counsellor actively covering every published support window.

## 2. Hard go/no-go gates

Every box below requires evidence and an accountable name. A missing box means **no launch**.

- [ ] A licensed clinician has reviewed the health content, deterministic risk rules and crisis wording. `CLINICAL_APPROVALS_JSON` contains valid named attestations for every current content version.
- [ ] A safeguarding lead owns crisis escalation during every test window and has rehearsed the procedure below.
- [ ] The exact retention schedule, privacy lawful basis, controller identity and participant notice have been approved for the pilot. Confirm PDPO registration/requirements with qualified Ugandan privacy counsel.
- [ ] `support@sistercare.app`, `privacy@sistercare.app`, the published phone number and WhatsApp number are real, monitored and tested from another device.
- [ ] Only invited adults have access. Each member has recorded the current pilot consent.
- [ ] Every counsellor in the pilot is KYC-approved, credential-current, crisis-trained where assigned, briefed on boundaries and able to go online/offline correctly.
- [ ] Migrations `0024_controlled_pilot_consent` and `0025_member_concern_reports` are applied to the same Supabase project used by production.
- [ ] Vercel production variables match `.env.example`; secrets are enabled for Production, not exposed as `NEXT_PUBLIC_*`, and `PILOT_PAUSED=false`.
- [ ] A fresh database backup exists, is encrypted, is stored outside the public repository, and its three dump files pass checksum validation.
- [ ] The two-browser rehearsal and the production smoke test below pass.
- [ ] `GET /api/health` returns HTTP 200 with every check `true`.

## 3. Named operating roles

Fill this table before inviting anyone. One person may hold more than one role only if they can meet both response duties.

| Role | Name | Reachable number | Coverage window | Backup |
|---|---|---|---|---|
| Pilot decision owner | | | | |
| Safeguarding lead | | | | |
| Licensed clinical reviewer | | | | |
| On-duty counsellor | | | | |
| Technical incident owner | | | | |
| Privacy/request owner | | | | |

## 4. Release procedure

1. Apply migrations in timestamp order. Do not edit the production schema manually after migration tracking is established.
2. Run `npm run pilot:verify` on the exact commit intended for deployment.
3. Set `SUPABASE_DB_URL` locally to the Session Pooler connection string. Percent-encode special password characters. Run:
   `powershell -ExecutionPolicy Bypass -File scripts/backup-supabase.ps1 -OutputDirectory C:\secure-sistercare-backups`
4. Encrypt the resulting directory and copy it to restricted off-site storage. Never commit database dumps.
5. Deploy the exact commit to Vercel Production and confirm the `sister-care.vercel.app` production alias points to it.
6. Run `PILOT_BASE_URL=https://sister-care.vercel.app npm run pilot:smoke` (PowerShell: `$env:PILOT_BASE_URL='https://sister-care.vercel.app'; npm.cmd run pilot:smoke`).
7. Record the commit hash, deployment URL, health response, backup manifest and gate owners in the pilot log.

## 5. Two-browser acceptance rehearsal

Use separate browser profiles so identities cannot overwrite each other.

1. Create one invited adult member and one approved counsellor.
2. Confirm the member sees the consent gate, can complete or skip onboarding once, and returns to the correct workspace after sign-in.
3. Confirm the counsellor starts offline, explicitly goes available and immediately appears available to the member and administrator.
4. Select that exact counsellor. Confirm the request appears within 15 seconds, can be accepted, and the member receives the change.
5. Exchange messages in both directions. Confirm neither side needs a page refresh.
6. Join private audio from both browsers. Confirm exactly two participants, audio only, no recording, no screen sharing, and expiry within the configured room lifetime.
7. End the session and submit feedback. Confirm rating and availability update consistently.
8. Submit an AI-response report and a session report. Confirm the administrator can take ownership and close each with a note.
9. Sign out. Confirm private local data is cleared and the counsellor becomes offline promptly.
10. Test one critical-risk phrase with the safeguarding lead present. Confirm emergency wording is correct and human escalation is visible. Do not use a real crisis during rehearsal.

## 6. During-pilot operation

- The pilot coordinator checks the admin overview, member reports, crisis queue, incident queue and counsellor availability at least every 10 minutes while support is advertised as live.
- Vercel Hobby cron runs only daily and cannot satisfy a real-time safety SLA. A named human must monitor during the pilot; do not claim 24/7 human response.
- Record timestamps for request, assignment, acceptance and first human reply. Follow up manually on any waiting member.
- Never copy chat or health text into personal WhatsApp, email, spreadsheets or screenshots. Use report/session identifiers in operational notes.
- Close counsellor availability at the end of the staffed window. Tell participants when human support is offline.
- Review all new reports and incidents before ending each day.

## 7. Stop conditions

Pause new activity immediately for any of these events:

- wrong-account data exposure or unauthorized access;
- emergency advice, emergency contacts or triage behaving incorrectly;
- a member reports active danger without accountable human follow-up;
- counsellor identity, assignment or message routing is wrong;
- audio admits an unintended participant or recording/video becomes enabled;
- widespread authentication, database or AI failure;
- loss of the on-duty counsellor or safeguarding owner;
- `/api/health` becomes not ready and does not recover after one verified retry.

## 8. Safe pause and rollback

1. The safeguarding lead first hands off or closes every live care session. Do not disconnect a person in distress without a safe alternative.
2. Stop recruitment and notify current participants that the pilot is paused.
3. In Vercel Production, set `PILOT_PAUSED=true` and redeploy. Admin and maintenance recovery routes stay available; member and counsellor workspaces show the safety-pause page.
4. Confirm `/api/health` returns 503 with `pilotAccess:false` and confirm care APIs return a 503 pause response.
5. Create and secure a fresh database backup before attempting repair.
6. For an application regression, promote the last known-good Vercel deployment. Do **not** reverse a database migration destructively. Use a reviewed forward corrective migration.
7. Preserve audit events, reports and technical logs. Record timeline, impact, affected identifiers, containment and owner without copying unnecessary health text.
8. Re-run `npm run pilot:verify`, the two-browser rehearsal and the production smoke test.
9. Only the pilot decision owner and safeguarding lead may approve setting `PILOT_PAUSED=false` and redeploying.

## 9. Daily closeout

- [ ] No member is waiting without an owner.
- [ ] All counsellors are offline after coverage ends.
- [ ] Reports and incidents have accountable statuses.
- [ ] Health and smoke checks pass.
- [ ] Participant feedback and defects are recorded without sensitive message text.
- [ ] The next coverage window and named owners are confirmed.

## 10. Known launch gates that code cannot approve

Engineering cannot sign clinical approval, legal basis, PDPO obligations, exact retention policy, counsellor staffing, support inbox ownership or emergency-response partnerships. These remain real blockers until the named qualified people approve and operate them. The emergency contacts embedded in SisterCare were rechecked against official Uganda sources on 19 August 2026, but the safeguarding lead must verify them again before each release.
