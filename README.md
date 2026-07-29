# SisterCare

SisterCare is a privacy-conscious health support platform for cycle tracking,
pregnancy support, AI-guided conversations, clinically governed content, and
live counsellor care.

## Product roles

- Members track health information, use the support assistant, read reviewed
  content, and request a counsellor.
- Counsellor applicants submit private KYC evidence and wait for an
  administrator's decision.
- Verified counsellors control live availability, accept assigned sessions,
  support members, and submit articles for editorial review.
- Administrators review KYC, govern counsellor capacity and safety eligibility,
  publish content, monitor crisis SLAs, handle incidents, and inspect
  privacy-safe service metrics.

## Technology

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Supabase Auth, Postgres, Storage, Realtime, Row Level Security, and server API
- Groq as the preferred AI inference provider with Gemini fallback
- Vercel for application hosting and daily scheduled maintenance

## Local setup

Requirements:

- Node.js 24
- A Supabase project
- At least one configured AI provider

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Configure the values documented in [.env.example](.env.example). Never expose
`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
`ADMIN_BOOTSTRAP_SECRET`, or AI provider keys to client code.

## Database setup

Open the Supabase SQL Editor and run every file in `supabase/migrations` in
filename order. The migrations create the data model, access policies, service
permissions, operational tables, atomic limits, and concurrency-safe session
matching.

The browser uses only the publishable key. Sensitive server operations use the
server secret and perform explicit authentication and role checks before data
access.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The safety-only suite is available as:

```powershell
npm.cmd run test:safety
```

## Important modules

- `src/lib/authClient.ts` — browser authentication facade
- `src/lib/serverAuth.ts` — server token validation and role enforcement
- `src/lib/dataClient.ts` — browser data access
- `src/lib/server/serverData.ts` — server domain data access
- `src/lib/server/sessions.ts` — presence, matching, and session lifecycle
- `src/lib/agent` — agent planning and execution
- `src/lib/clinicalGovernance.ts` — clinical release controls
- `supabase/migrations` — schema, RLS, grants, and server-only functions

See [Developer Guide](docs/DEVELOPER_GUIDE.md) and
[Architecture](docs/ARCHITECTURE_V2.md) for operational detail.
