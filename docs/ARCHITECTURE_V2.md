# SisterCare Production Architecture

## System boundaries

```text
Browser / PWA
  -> Supabase Auth
  -> participant-scoped Postgres access through RLS
  -> Next.js API for privileged and agent actions

Next.js API
  -> verified access token + profile role
  -> server-only Supabase client
  -> Groq, then Gemini fallback
  -> audit, metrics, incidents, and counselling workflows

Administrators and counsellors
  -> dedicated role portals
  -> the same verified API boundary
```

## Trust model

- Supabase Auth establishes identity.
- `profiles.role` establishes application authorization.
- RLS protects direct browser access.
- API routes re-check identity, role, ownership, and state.
- Server secrets are never included in browser bundles.
- Clinical and operational changes are auditable.
- Missing configuration, identity, or role fails closed.

## Data domains

- `profiles`: member identity, preferences, cycle and pregnancy state
- `conversations`, `messages`: persistent assistant memory
- `user_records`: symptoms, reminders, cycle history, and agent events
- `counsellor_applications`: private KYC workflow
- `counsellors`: verified directory, operational eligibility, and presence
- `counselling_sessions`, `session_messages`: human-care lifecycle
- `library_articles`: counsellor authoring and admin editorial review
- `audit_events`: consequential event trail
- `incidents`: safety ownership and resolution
- `metrics_daily`: privacy-safe aggregated outcomes
- `operations_heartbeats`: maintenance health
- `rate_limits`: atomic abuse controls

## Agent pipeline

```text
authenticate
  -> load trusted context and conversation memory
  -> triage
  -> generate plan
  -> validate bounded action
  -> execute server operation
  -> verify result
  -> compose complete localized response
  -> persist conversation and outcome
```

Navigation and sign-out are client actions emitted by the agent and executed by
the browser. Health, cycle, pregnancy, profile, and counsellor actions execute
on the server against the authenticated user.

## Counsellor matching

Candidates must be verified, credential-current, accepting new sessions,
on-shift, below capacity, and recently online. Critical sessions additionally
require crisis training. Ranking considers specialty, language, load, schedule,
and quality. An atomic database function prevents concurrent matchers from
double-assigning a counsellor.

The session queue is the set of rows in `requested` state. Matching runs when:

- a session is requested;
- a counsellor becomes available;
- a counsellor declines or completes work;
- the maintenance sweep runs.

## Safety and observability

Triage is deterministic before model generation. Critical wait times progress
through escalation thresholds and open an accountable incident at the SLA
breach. Operational telemetry uses salted identifiers and aggregate counts,
never raw message or health content.

The admin portal reads the same live tables used by matching and care delivery,
so it does not display a separate static view of availability.

## Availability target

The deployment is intentionally compatible with a free Vercel and Supabase
setup. Event-driven work handles normal traffic; the daily scheduled sweep is
a recovery mechanism. Moving to paid infrastructure later may increase sweep
frequency without changing the domain model.
