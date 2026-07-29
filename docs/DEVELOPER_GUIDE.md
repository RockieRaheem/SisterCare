# SisterCare Developer Guide

## Core rules

1. Health and identity data fail closed: no protected route may accept a
   client-supplied identity without verifying its bearer token.
2. Roles come from `profiles.role`, not browser metadata.
3. Browser code uses `authClient.ts` and `dataClient.ts`; server code uses
   `serverAuth.ts`, `supabaseAdmin.ts`, and `server/serverData.ts`.
4. The publishable key may run in the browser. Server secrets never may.
5. Consequential changes emit an audit event.
6. Clinical content must have genuine, current approval before production
   release.
7. Real counsellor availability requires a fresh heartbeat and capacity.
8. Never assign demo profiles or an offline, unverified, expired, suspended,
   off-shift, overloaded, or crisis-untrained counsellor.

## Environment

Required for production:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe API key |
| `SUPABASE_SECRET_KEY` | Preferred server-only project key |
| `GROQ_API_KEY` or `GEMINI_API_KEY` | AI inference |
| `CRON_SECRET` | Scheduled maintenance authentication |
| `ADMIN_BOOTSTRAP_SECRET` | One-time first-admin activation |
| `TELEMETRY_HASH_SALT` | Privacy-safe telemetry identifiers |
| `CLINICAL_APPROVALS_JSON` | Named clinical release approvals |

`SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy server-key format.
`ALLOW_UNAUTHENTICATED_DEV=true` is local-only and is rejected by production
configuration validation.

## Database

Run `supabase/migrations/*.sql` in filename order. New tables must:

- enable Row Level Security;
- revoke broad access before granting the minimum required privileges;
- include participant or owner policies for browser-visible data;
- reserve cross-user and administrative operations for the server role;
- use database functions when concurrency requires an atomic decision.

`claim_counselling_session` atomically claims an available counsellor and a
queued session. `consume_rate_limit` and `increment_daily_metric` provide
atomic server operations.

## Authentication and roles

`authenticateRequest()` validates the access token against Supabase Auth and
then loads the role from the application profile. A valid identity with a
missing profile remains authenticated only so the bootstrap route can repair
the profile; all role checks still fail closed.

Product roles are:

- `member`
- `counsellor`
- `admin`

The server compatibility type uses `user` for member-facing authorization.
The first admin is activated once through `/admin/setup`; rotate or remove the
bootstrap secret immediately afterwards.

## Counsellor workflow

1. A user selects counsellor registration.
2. The authenticated applicant uploads a profile photo and private KYC files.
3. The application remains pending until an admin verifies or rejects it.
4. Approval creates or updates the counsellor directory record and role.
5. Signing in does not automatically accept work. The counsellor chooses
   Available, which records a heartbeat.
6. A heartbeat older than 120 seconds is treated as offline.
7. Any live assignment is the source of truth for `in_session`.

Session states:

`requested -> matched -> accepted -> active -> completed -> feedback_received`

Timeout and crisis paths may rematch, expire, or escalate a session.

## Admin operations

Admin endpoints provide:

- network and KYC overview;
- counsellor verification and operational controls;
- article review and publication;
- crisis waiting-time statistics;
- incident acknowledgement and resolution;
- request and service-health metrics.

All endpoints return JSON on both success and failure. Client pages should use
defensive response parsing and show an actionable error without erasing
previously loaded data.

## AI agent

The chat route:

1. authenticates the member;
2. loads profile, health state, conversation memory, and system context;
3. performs safety triage;
4. lets the model propose bounded actions;
5. validates and executes permitted actions on the server;
6. stores both messages and action outcomes;
7. routes high-risk cases into the human-care workflow.

Groq is first when `AGENT_PROVIDER_ORDER=groq,gemini`. Provider failure falls
back to Gemini. The model is never trusted to claim an update succeeded:
success language must be based on an executed tool result.

## Testing

Before every production change:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

For health-safety changes, also run `npm.cmd run test:safety` and obtain the
required clinical review.

## Deployment

Vercel Hobby permits scheduled jobs only once per day. `vercel.json` therefore
uses a daily maintenance schedule. Presence and queue draining are also
event-driven when counsellors heartbeat or sessions change, so normal matching
does not wait for the daily job.

After adding migrations:

1. apply them to the Supabase project;
2. deploy the matching application commit;
3. check `/api/health`;
4. test one member, counsellor, and admin flow;
5. verify Vercel function logs and the admin operations dashboard.
