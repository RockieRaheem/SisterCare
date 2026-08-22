# SisterCare

SisterCare is a private support platform for women who may not feel safe or
comfortable discussing mental health, menstrual health, relationships, loss,
harassment, or other sensitive experiences with people around them.

The product is built around a simple idea: the first step toward support should
not require a perfect explanation. A member can begin privately with Sister,
keep useful personal context, or ask to speak with a verified human counsellor
without sharing her identity with that counsellor.

**Current status:** SisterCare is being prepared for a small, supervised,
adult-only pilot. It is not approved for an unrestricted clinical launch, does
not diagnose medical or mental-health conditions, and is not an emergency
service. The wider mission includes school and community programmes for younger
girls, but minors require separate legal, consent, and safeguarding approval
before they can use the software.

- Live application: [sister-care.vercel.app](https://sister-care.vercel.app/)
- Product contract: [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- Pilot operations: [Pilot Runbook](docs/PILOT_RUNBOOK.md)
- Current gaps: [Production Readiness Audit](docs/PRODUCTION_READINESS_AUDIT.md)

## What the application does

### For members

- Provides a private AI conversation space for sensitive questions and
  emotional support.
- Keeps conversation context so a member does not have to repeat information
  already shared or saved in SisterCare.
- Supports concise emotional check-ins without scores, streaks, or clinical
  labels.
- Tracks menstrual cycles, physical symptoms, and relevant history as a
  separate body-health context.
- Lets a member choose a verified counsellor, see live availability, and request
  anonymous text or audio support.
- Offers reviewed library content and clear routes to urgent human help.

### For counsellors

- Separates account registration, private KYC evidence, and administrator
  verification.
- Provides live availability and capacity controls so offline or busy
  counsellors cannot receive new assignments.
- Supports assigned requests, real-time private messaging, and two-person audio
  calls.
- Allows verified counsellors to maintain their professional profile and submit
  educational content for review.

### For administrators

- Reviews counsellor identity and professional credentials.
- Manages eligibility, capacity, availability, and editorial approvals.
- Monitors waiting members, active sessions, safety incidents, and service
  health without exposing unnecessary personal data.
- Maintains an audit trail for sensitive operational decisions.

## Language and accessibility

SisterCare currently supports English, Luganda, Acholi, Lugbara, Runyankole,
Ateso, and Swahili in its language catalogue. Sunbird provides the local-language
speech and translation layer. Spoken replies are available where the selected
language has a supported voice; Lugbara currently has no selectable text-to-
speech voice.

The interface also includes keyboard navigation, visible focus states, semantic
labels, responsive layouts, and text alternatives. Accessibility remains part
of release testing rather than a one-time checklist.

## How the system is organised

| Area | Implementation |
| --- | --- |
| Web application | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Authentication and data | Supabase Auth, Postgres, Storage, Realtime, and Row Level Security |
| AI orchestration | Groq first, with Gemini as a fallback provider |
| Local-language speech | Sunbird speech-to-text, translation, and text-to-speech |
| Private audio calls | Short-lived Daily rooms and participant tokens |
| Hosting | Vercel functions, static delivery, and two daily maintenance jobs |
| Quality controls | Vitest, Testing Library, type checking, linting, builds, and pilot smoke tests |

The browser receives only Supabase's publishable key. Privileged database
operations stay on the server and require an authenticated identity plus an
explicit role check. Supabase Row Level Security remains a second boundary; it
is not treated as a replacement for server-side authorization.

## Repository guide

```text
src/app/                 Pages and API routes
src/components/          Shared interface components
src/contexts/            Authentication, language, and application state
src/lib/agent/           Agent planning and action execution
src/lib/server/          Server-only data and session services
src/lib/__tests__/       Unit and contract tests
supabase/migrations/     Ordered database migrations and access policies
scripts/                 Pilot verification and smoke-test utilities
docs/                    Product, safety, operations, and launch documents
public/                  Installable-app assets and public resources
```

## Run SisterCare locally

### Requirements

- Node.js 24
- npm
- A Supabase project
- At least one AI provider key: Groq or Gemini

On Windows PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

On macOS or Linux:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server is
not a substitute for the production verification commands below.

## Environment configuration

Start from [.env.example](.env.example). These are the main groups of settings:

| Purpose | Variables |
| --- | --- |
| Public Supabase client | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Server-side Supabase access | `SUPABASE_SECRET_KEY` |
| AI providers | `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `AGENT_PROVIDER_ORDER` |
| Local-language speech | `SUNBIRD_API_KEY` |
| Private audio calls | `DAILY_API_KEY`, `DAILY_DOMAIN` |
| Operational security | `CRON_SECRET`, `ADMIN_BOOTSTRAP_SECRET`, `TELEMETRY_HASH_SALT` |
| Pilot control | `PILOT_PAUSED` |
| Clinical release gate | `CLINICAL_APPROVALS_JSON` |
| Public support contacts | the `NEXT_PUBLIC_SUPPORT_*` variables in `.env.example` |

`SUPABASE_SERVICE_ROLE_KEY` and the `AUDIO_PROVIDER_*` variables are retained as
legacy aliases for deployments that have not yet moved to the current names.
Do not prefix secrets with `NEXT_PUBLIC_`, commit them, paste them into issues,
or expose them in browser logs.

## Create the database

1. Create a Supabase project with the Data API enabled and automatic Row Level
   Security enabled.
2. Open the Supabase SQL Editor.
3. Run every SQL file in [supabase/migrations](supabase/migrations) in filename
   order.
4. Confirm that authentication, profile creation, storage policies, counsellor
   applications, sessions, and operational functions exist before testing user
   journeys.

The migrations are the source of truth for the database. Avoid making manual
dashboard changes that are not captured in a new migration.

## Activate the first administrator

1. Generate a long random value and set it as `ADMIN_BOOTSTRAP_SECRET` in the
   server environment.
2. Create and sign in to the trusted SisterCare account that will become the
   first administrator.
3. Visit `/admin/setup` and submit that one-time secret.
4. Verify access to the admin portal, then rotate or remove the bootstrap secret
   after another authorised administrator can manage roles.

Never share the bootstrap secret with a counsellor applicant or member.

## Verify a change

Run the standard checks before committing:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Useful focused checks:

```powershell
npm.cmd run test:safety
npm.cmd run test:coverage
npm.cmd run pilot:verify
npm.cmd run pilot:smoke:public
```

`pilot:verify` checks local pilot configuration. The full authenticated smoke
test needs the temporary test-account variables described in `.env.example`.
The public smoke test can run without those credentials.

## Deploy

SisterCare is deployed on Vercel. Add the environment variables to the intended
Preview and Production environments, deploy the application, and then verify:

1. `GET /api/health` reports `ready`, not `not_ready`.
2. A new member can register, complete or skip onboarding, sign out, and return.
3. A counsellor can submit KYC, be reviewed, go available, and receive the
   intended member's request.
4. Both participants can exchange messages and join the same private audio
   room.
5. AI responses, safety escalation, local-language speech, and provider fallback
   behave as expected.
6. The admin portal shows current availability, waiting requests, incidents,
   and service health.

The two cron expressions in [vercel.json](vercel.json) run once daily so they
remain compatible with Vercel Hobby limits. Live product correctness must not
depend on a frequent cron job.

## Safety and privacy boundaries

- SisterCare is a support and navigation tool, not a replacement for a licensed
  clinician or emergency response service.
- Critical disclosures must lead to clear human-help options; an AI response is
  never considered the completed crisis intervention.
- Counsellors receive only the identity and chat context a member has consented
  to share.
- KYC documents are private operational records and must never appear in public
  counsellor profiles.
- Sensitive routes use explicit authorization, private caching rules, and
  privacy-safe telemetry.
- Pilot access can be stopped with `PILOT_PAUSED` if a safety or operational
  issue makes continued use inappropriate.

Read [Pilot Runbook](docs/PILOT_RUNBOOK.md) before placing the product in front
of participants. It defines the adult-only pilot boundary, support coverage,
incident ownership, rollback conditions, and evidence that must be collected.

## Contributing

Keep changes small enough to review and verify. For each increment:

1. Read the relevant product and safety documentation.
2. Add or update tests for changed behaviour.
3. Run the checks that match the risk of the change.
4. Use a short, one-line commit message describing the completed outcome.
5. Never combine unrelated local work or credentials in the commit.

For architecture or behaviour changes, update the corresponding document in
`docs/` in the same increment so the repository continues to describe the
software that actually exists.

## Before a wider launch

The repository still records launch blockers that code alone cannot resolve:
named clinical and safeguarding owners, jurisdiction-specific approval,
verified emergency contacts, staffed escalation coverage, retention decisions,
accessibility evidence, and a completed pilot review. Until those controls are
real and documented, SisterCare should remain a small, supervised adult pilot.

Keeping those limits visible is part of the product, not a disclaimer to remove
later.
