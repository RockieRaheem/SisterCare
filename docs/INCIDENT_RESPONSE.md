# SisterCare Incident Response

## Purpose

This runbook covers safety, privacy, authentication, availability, and data
integrity incidents. Never paste user messages, health data, access tokens, or
phone numbers into tickets or chat channels.

## Severity

| Severity | Definition | Acknowledge | Lead |
|---|---|---:|---|
| SEV-1 | Active safety risk, data exposure, auth bypass, or widespread outage | 5 minutes | Incident commander + safeguarding lead |
| SEV-2 | Degraded counselling, repeated model/tool failure, or partial outage | 15 minutes | On-call engineer |
| SEV-3 | Limited defect with a safe workaround | 1 business day | Feature owner |

## First response

1. Acknowledge the incident in `/admin/incidents`.
2. Assign one incident commander and one safeguarding lead for safety events.
3. Protect users first: disable the affected feature or route traffic to the
   deterministic fallback. Do not wait for root-cause certainty.
4. Preserve privacy-safe evidence: request IDs, timestamps, event types,
   deployment version, status codes, and pseudonymous identifiers.
5. For an unhandled crisis, contact the on-shift supervisor and confirm the
   user has been shown Sauti 116, Police 999/112, and hospital guidance.
6. Record decisions and timestamps in the incident timeline.

## Containment actions

- Authentication bypass: disable the deployment, rotate credentials, revoke
  sessions, and review role changes.
- Data exposure: disable reads, preserve access logs, rotate affected secrets,
  and begin the applicable notification assessment.
- Counsellor outage: stop promising live availability, keep requests queued,
  and surface emergency resources.
- AI failure: disable generative responses and retain deterministic safety and
  resource responses.
- Translation failure: fall back through reviewed localized strings to clear
  English; native crisis lexicons remain active.

## Resolution

An incident can be resolved only after user impact is contained, monitoring
shows recovery, and a resolution note is recorded. SEV-1 and SEV-2 incidents
require a blameless review within two business days with:

- timeline and detection gap;
- user and safety impact;
- contributing technical and operational causes;
- corrective actions with owners and dates;
- a regression test or drill where applicable.

Raw health content must not be copied into the review.

