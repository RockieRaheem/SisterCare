# SisterCare System Overview

SisterCare brings menstrual health, pregnancy support, private AI guidance,
reviewed learning content, and live human counselling into one role-aware
product.

## Member experience

Members can:

- maintain cycle and pregnancy information;
- record symptoms and preferences;
- receive complete multilingual guidance with safety triage;
- ask the assistant to perform supported account and health updates;
- keep persistent conversation history;
- read clinically reviewed articles;
- request and message an eligible counsellor.

## Counsellor experience

Counsellors have a dedicated application and work portal. KYC evidence remains
private until administrative review. Verified professionals can control their
availability, receive assignments only when eligible, manage live sessions,
and submit health articles for editorial review.

## Administrator experience

Administrators have a separate operations portal for:

- KYC decisions;
- counsellor capacity, credential, shift, and crisis-training controls;
- content review;
- crisis SLA monitoring;
- incident ownership;
- privacy-safe service metrics and maintenance health.

## AI behavior

The assistant receives trusted profile and system context plus the active
conversation history. It can execute only registered actions and reports
success only after the action succeeds. Groq is the preferred provider, with
Gemini as fallback. Deterministic triage and human escalation remain outside
model discretion.

## Data and security

Supabase provides authentication, Postgres data, private file storage,
realtime updates, and Row Level Security. Protected server routes verify access
tokens and application roles. Sensitive operations use a server-only key and
write audit events.

## Deployment

The Next.js application runs on Vercel. Supabase migrations in
`supabase/migrations` define the production database and access model. The free
deployment uses event-driven matching plus one daily maintenance sweep.
