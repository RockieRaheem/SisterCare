# SisterCare Production Readiness Audit

**Audit date:** 4 August 2026  
**Scope:** application code, API routes, role boundaries, AI pipeline, database
migrations, counselling sessions, private audio, privacy controls, PWA,
operations, and automated verification  
**Decision:** **Not ready for an unrestricted public health launch**

## Executive assessment

SisterCare has a credible product direction and several unusually strong
foundations for an early-stage health-support product: server-owned identity,
Supabase RLS, deterministic crisis triage, counsellor eligibility rules,
private Daily rooms, clinical release gates, privacy preferences, and
role-specific workspaces.

The system is still pre-production. The most important blocker is deliberate:
the clinical registry has no real reviewer attestations, so `/api/health`
correctly reports `clinicalGovernance: false` in production. The application
must not describe its health guidance as approved until named qualified
reviewers have approved the exact registered versions.

Automated test coverage was also too narrow. Before this audit, 48 files and
243 tests passed while executing only 9.97% of source lines. This audit added a
whole-source coverage command, browser component harness, architecture
contracts, API boundary tests, persistence failure tests, and agent tool-loop
tests. The resulting suite has 60 files and 299 tests and executes 14.31% of
source lines. That is a meaningful increase and a regression floor, not a
claim of comprehensive behavioral coverage.

## System inventory

| Surface | Audited inventory |
| --- | ---: |
| TypeScript/TSX source files | 224 |
| API route modules | 32 |
| application pages | 33 |
| ordered Supabase migrations | 20 |
| automated test files before audit | 48 |
| automated test files after audit | 60 |
| passing tests after audit | 299 |

The application is a Next.js 16/React 19 PWA. Supabase owns authentication,
Postgres data, Storage, Realtime and RLS. Groq is the preferred agent provider
with Gemini fallback. Daily provides private in-app audio. Vercel hosts the
application and invokes daily maintenance endpoints.

## What is now enforced

### Repository-wide contracts

- Every API handler must return structured JSON.
- Every non-public API handler must contain caller or scheduler verification.
- Public API access is an explicit allow-list limited to health readiness and
  published library content.
- Firebase and Stellar runtime packages and imports cannot be reintroduced.
- Supabase migration sequence numbers must remain continuous.
- Core health, identity, session, KYC, audit and incident tables must retain
  RLS declarations.
- Sensitive operational tables must remain revoked from browser roles.
- Committed environment examples cannot contain server secret values.
- Vercel cron expressions must remain once-daily Hobby-compatible schedules.

### Identity and role boundaries

- Invalid tokens cannot reach protected account operations.
- Administrators always resolve to the administrator workspace.
- A login choice cannot convert an established member into a counsellor.
- A real KYC application preserves the counsellor registration path.
- Member onboarding is rejected for administrators, counsellors and
  counsellor applicants.
- Browser workspace boundaries hide member UI while redirecting
  administrators and counsellors to their own portals.

### Counselling and presence

- Members cannot self-assign crisis priority.
- Preferred counsellor identifiers are validated before matching.
- Member and professional session listings use different authenticated paths.
- Presence accepts only `available` or `offline`.
- Going available requires current verified counsellor access.
- Expired credentials and other eligibility failures return actionable
  messages instead of a generic presence error.

### AI and deterministic actions

- Persisted conversation history is sent to the provider.
- Clinical reasoning tools are removed when clinical governance is unavailable.
- Model-selected writes are rebound to the verified caller.
- Tool execution produces a privacy-minimized audit event.
- Sign-out and navigation requests return executable client actions.
- Pregnancy confirmation can be recovered from earlier user turns.
- Day-first dates are parsed without the Uganda-timezone one-day shift.
- A request for “counsellor sessions” now opens sessions, not the directory.
- Explicit dates, pregnancy durations and due dates are not conflated.
- Provider truncation and visibly incomplete Luganda responses are rejected.

### Destructive and operational paths

- Account deletion is tested for database failure, empty storage prefixes and
  correct user scoping.
- Account data deletion must complete before the auth identity is deleted.
- Maintenance readiness fails closed when a required job is missing or stale.
- Database readiness probes all required tables, columns and the atomic match
  function.
- Incident transitions use optimistic concurrency and reject stale updates.
- Audit emission failure does not break the member action that produced it.

## Defects found and corrected during the audit

1. **Timezone date corruption:** day-first pregnancy dates were constructed in
   local time and became the previous calendar day when serialized to UTC.
   Dates now use UTC construction and UTC due-date arithmetic.
2. **Ambiguous navigation:** “open my counsellor sessions” matched
   `counsellor` before `sessions`. Specific session intent now wins.
3. **Stale React closures:** chat voice input, dashboard loading, settings
   loading and auth profile loading had incomplete hook dependencies.
4. **Hard browser navigation:** chat actions used `window.location`, causing a
   full application reload. They now use the Next.js router.
5. **CI/runtime mismatch:** CI used Node 20 while the production contract
   requires Node 24. CI now uses Node 24.
6. **Non-enforced coverage:** passing tests had no measurement or minimum.
   CI now executes whole-source V8 coverage and rejects regression below the
   current baseline.

## Remaining production risks

### Critical — must be resolved before a public health launch

#### C1. Clinical approval is intentionally incomplete

Every registered article, crisis response and risk rule still requires real
clinical or safeguarding review. `CLINICAL_APPROVALS_JSON` must contain a
current named attestation for every exact content version. Engineering tests
cannot replace this review.

**Release requirement:** create and complete a formal review procedure around
`src/lib/clinicalGovernance.ts`, retain reviewer evidence, validate translated
content independently, and require `/api/health` to return HTTP 200 before
promotion.

#### C2. No live end-to-end release test exists

The suite mocks Supabase, Groq, Gemini and Daily. It proves local contracts but
does not prove that production keys, RLS policies, Realtime, storage buckets,
provider quotas, webhooks, private room tokens or Vercel aliases work together.

**Release requirement:** create an isolated staging Supabase project and test
the complete member, applicant, counsellor and admin journeys against real
services before every production promotion.

### High — required for a dependable service

#### H1. Behavioral coverage remains low

Whole-source line coverage is 14.31%. All page modules and most API handlers
still lack direct behavioral tests. The current 14% floor prevents regression;
it is not an acceptable long-term target for a health-support system.

**Next target:** cover every API handler's 401, 403, validation, success and
dependency-failure paths; then cover signup, login, onboarding, chat,
counsellor application, KYC review, matching, messaging, calls, settings and
account deletion with browser tests. Raise the floor incrementally to at least
70% lines and 60% branches without excluding risky code.

#### H2. Four modules remain operational monoliths

- `src/app/chat/page.tsx`: approximately 2,087 lines
- `src/app/api/chat/route.ts`: approximately 1,635 lines after this audit
- `src/lib/agent/executor.ts`: approximately 2,351 lines
- `src/lib/server/sessions.ts`: approximately 973 lines

These files combine parsing, orchestration, persistence, provider calls and UI
state. A small change can affect unrelated behavior and makes focused testing
expensive.

**Required refactor:** continue the pipeline extraction used for chat intent:
request validation, safety, memory, deterministic actions, provider execution,
tool authorization, persistence, localization and response assembly should be
separate modules with typed inputs and outputs.

#### H3. Daily maintenance cannot enforce real-time safety SLAs

Vercel Hobby invokes each configured job only once per day. That is suitable
for cleanup, not for a ten-minute crisis handoff target, presence expiry or
prompt rematching. Browser heartbeats help only while a counsellor's page is
active.

**Required architecture:** use a continuously available worker, Supabase
scheduled function, queue, or database scheduler for time-sensitive session
work. Keep Vercel daily jobs as reconciliation, not primary orchestration.

#### H4. Audit delivery is best-effort

`emitEvent` deliberately swallows database errors so member actions continue.
That is appropriate for availability but can lose evidence needed for
safeguarding or incident investigation.

**Required architecture:** write critical events through a transactional
outbox and retry worker; alert when the outbox age or failure count exceeds a
threshold.

#### H5. Account deletion is not transactional

Deletion spans article rows, audit rows, two storage buckets and the auth user.
A mid-operation provider failure can leave a partially deleted account.
Storage listing is also capped at 1,000 objects per prefix.

**Required architecture:** use a resumable deletion job with progress state,
pagination, idempotent steps, retry policy and an administrator-visible
failure queue. Define which safety/audit records must legally be retained
instead of deleting them implicitly.

#### H6. Security headers lack an enforced CSP

HSTS, frame denial, MIME protection, referrer policy and permission policy are
present. There is no Content Security Policy, and the root layout depends on a
third-party Google icon font.

**Required work:** introduce CSP in report-only mode, inventory Supabase,
Daily, image and font origins, eliminate avoidable inline code, then enforce
the policy. Self-host the icon font if privacy or low-connectivity testing
shows the external dependency is unacceptable.

#### H7. External-provider compliance is unresolved

Daily's free plan does not include its healthcare compliance add-on. Whether
that is legally acceptable depends on launch jurisdiction, data classification
and the exact information transmitted. Similar data-processing review is
needed for AI and translation providers.

**Required governance:** complete a data-flow map, vendor agreements,
jurisdiction assessment, incident contacts and a written rule for what health
content may leave SisterCare's controlled database.

### Medium — resolve during controlled pilot hardening

- The product vision is international, but clinical governance and regional
  resources are currently Uganda-specific.
- Luganda translation has deterministic integrity tests but no native-speaker
  clinical acceptance set or measured quality threshold.
- Offline queue, local chat storage, browser notifications, TTS cache and
  Realtime reconnection have little or no execution coverage.
- There is no automated accessibility scan, keyboard journey suite, mobile
  viewport matrix or screen-reader acceptance test.
- There are no performance budgets for the 2,000-line chat UI, low-cost
  Android devices, slow networks or provider latency.
- Operational metrics are stored internally, but there is no demonstrated
  on-call alert delivery, escalation rota or recovery drill.
- Backup restoration, point-in-time recovery, credential rotation and
  compromised-counsellor procedures are not exercised by automation.
- Provider rate limits and concurrent counsellor claiming need load and race
  tests against a real Postgres instance.
- README currently links to absent clinical-governance, developer-guide and
  architecture documents. Operational instructions must be restored or those
  links removed before an external engineering handoff.

## Test strategy required from here

| Layer | Current evidence | Next release gate |
| --- | --- | --- |
| Pure domain logic | strong for safety, cycle, role routing and matching | property and mutation tests |
| API handlers | direct tests for selected identity, onboarding, presence and session paths | every handler and failure class |
| Components | browser harness and access-boundary tests | forms, chat composer, KYC, install and session UI |
| Database | migration order/RLS declaration contracts | ephemeral Supabase migrations plus adversarial RLS tests |
| AI | mocked provider memory/tool loop and integrity tests | fixed multilingual evaluation set and live contract tests |
| Counselling audio | provider serialization and Daily API unit tests | two-browser private-room staging journey |
| Operations | readiness, incident and heartbeat unit tests | worker, alert delivery and incident drill |
| PWA/offline | manifest/install/offline pure tests | install/update/offline browser automation |

## Recommended release sequence

1. Complete real clinical and safeguarding approval.
2. Create staging infrastructure and seed four non-production roles.
3. Add database integration tests that run all migrations from an empty
   project and attempt cross-user access.
4. Add Playwright journeys for member, counsellor applicant, verified
   counsellor and administrator.
5. Split the chat route, agent executor, session service and chat page into
   testable stages.
6. Move safety-sensitive scheduling off once-daily Vercel cron.
7. Add CSP, vendor data-flow review, alert delivery and recovery drills.
8. Run a small supervised pilot with documented support hours and rollback
   criteria before public availability.

## Verification commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:coverage
npm.cmd run test:safety
npm.cmd run build
npm.cmd audit --omit=dev
```

The generated HTML coverage report is local at `coverage/index.html` and is
excluded from Git. CI uses the same coverage command on Node 24.
