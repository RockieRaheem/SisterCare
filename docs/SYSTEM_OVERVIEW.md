# SisterCare System Overview

SisterCare is a private first doorway to menstrual, emotional, and sensitive
personal support for girls and women who may not feel able to speak openly
elsewhere. It combines non-judgmental conversation, lightweight tracking,
contextual reviewed guidance, and anonymous access to verified human
counsellors in one role-aware product.

Pregnancy questions remain supported for safety and appropriate referral, but
detailed fertility, pregnancy, and postpartum tracking are not the product's
primary direction.

## Member experience

Members can:

- ask sensitive questions in a private conversation;
- maintain menstrual and emotional-wellbeing information;
- control what context is retained or shared with a counsellor;
- receive complete multilingual guidance with safety triage;
- ask the assistant to perform bounded, verified account and tracking updates;
- keep persistent conversation history;
- receive contextual clinically reviewed guidance; and
- request anonymous text or audio support from an eligible counsellor.

## Counsellor experience

Counsellors have a dedicated application and work portal. KYC evidence remains
private until administrative review. Verified professionals can control their
availability, receive assignments only when eligible, manage anonymous member
sessions, escalate safeguarding concerns, and submit health knowledge for
editorial review. A counsellor receives only the member context authorized for
the assigned session.

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
