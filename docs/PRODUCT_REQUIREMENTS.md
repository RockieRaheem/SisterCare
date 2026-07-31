# SisterCare Product Requirements

**Document status:** Approved product direction

**Product stage:** Pre-production hardening

**Last updated:** 31 July 2026
**Primary audience:** Product, design, engineering, clinical, safeguarding,
operations, and quality-assurance teams

## 1. Product definition

SisterCare is a private, non-judgmental support platform for girls, young
women, and adult women who may not feel safe or comfortable asking sensitive
questions of friends, parents, relatives, or local service providers.

SisterCare gives each member a discreet first place to:

- ask sensitive questions without shame;
- talk anonymously to a verified counsellor by text or in-app voice;
- understand menstruation, puberty, emotional wellbeing, relationships, and
  personal safety;
- privately track menstrual and emotional wellbeing;
- recognize when a concern may need professional or urgent support; and
- move from a difficult first disclosure to an appropriate next step.

The product promise is:

> **Ask anything. Stay private. Be heard without judgment. Reach safe help
> when you need it.**

SisterCare is not a fertility-first application, a social network, an
unmoderated peer forum, a substitute for emergency services, or a medical
diagnosis system.

## 2. The problem

Many girls and women experience shame, stigma, fear, limited privacy, or
judgment when asking about menstruation, puberty, emotional distress, sexual
health, relationships, abuse, or other sensitive experiences.

The resulting barriers include:

- questions remaining unanswered;
- myths being accepted as health advice;
- treatable menstrual concerns being normalized or ignored;
- emotional distress being hidden until it becomes more serious;
- delayed access to competent care;
- unsafe disclosure to unverified strangers; and
- loss of trust when digital services expose identity or make false promises.

Existing tracking applications generally begin with data entry. SisterCare
begins with a private conversation and helps the member decide what to do next.

## 3. Product outcomes

SisterCare succeeds when it:

1. makes a member feel safe enough to ask a question she could not ask
   elsewhere;
2. responds in respectful, understandable, age-appropriate language;
3. connects a member to an eligible human counsellor when she asks or when a
   safe handoff is appropriate;
4. helps the member complete an appropriate next step;
5. keeps menstrual and emotional records accurate and private;
6. identifies urgent risk without exaggerating or dismissing it; and
7. earns repeat use through trust rather than addictive engagement.

## 4. Target members

### 4.1 Primary member groups

- Girls approaching or experiencing menstruation for the first time
- Adolescents with sensitive menstrual, emotional, relationship, or body
  questions
- Young women who cannot comfortably ask people around them for help
- Adult women seeking private menstrual or emotional support
- Members using shared devices, low-cost phones, or unreliable connectivity
- Members who prefer a local language, voice, or code-switched conversation

### 4.2 Professional users

- Verified counsellors providing text and voice support
- Counsellor supervisors responsible for quality and safeguarding
- Clinical reviewers responsible for health content and response standards
- Administrators responsible for identity verification, safety, incidents,
  access, service availability, and audits

### 4.3 Age and jurisdiction

SisterCare may serve minors only after a jurisdiction-specific legal and
safeguarding review defines:

- minimum permitted age;
- consent and parental-consent requirements;
- mandatory-reporting duties;
- crisis and emergency procedures;
- record-retention requirements; and
- counsellor qualification requirements.

The product must not infer one country's rules apply globally. Country
launches require explicit approval and configured local support information.

## 5. Product principles

### P1. Conversation before configuration

A member must be able to ask for help without completing a long health
profile. Onboarding requests only information required for safety, language,
privacy, and service eligibility.

### P2. Privacy the member can understand

The interface must explain what is anonymous to a counsellor, what the
platform retains, who can access it, and any safety-related limits. SisterCare
must never promise absolute anonymity when it cannot technically or legally
provide it.

### P3. No judgment

Language, interface copy, AI responses, counsellor conduct, and operational
policy must not shame menstruation, sexuality, emotional distress, identity,
relationships, or help-seeking.

### P4. Human care is a real service

Availability, matching, waiting, calls, messages, and follow-ups must reflect
confirmed backend state. The system must not claim a counsellor is connected,
a message is delivered, or an action is complete without verification.

### P5. Safety is deterministic

Models may assist with understanding but do not control crisis classification,
authorization, record access, or escalation policy. High-risk pathways must be
testable and clinically governed.

### P6. Member control

The member controls optional tracking, conversation retention, counsellor
sharing, notifications, and reversible profile changes wherever law and safety
requirements permit.

### P7. Work on the member's device and network

Core reading, drafts, tracking, and navigation must remain usable on small
screens and slow connections. Live features must fail honestly and offer a
lower-bandwidth alternative.

### P8. Evidence over engagement

Product decisions optimize helpful outcomes, safety, comprehension, and access
to care—not time spent, streaks, emotional manipulation, or notification
volume.

## 6. Product scope

### 6.1 Primary scope

1. Private AI-assisted conversation
2. Anonymous verified-counsellor text sessions
3. Anonymous in-app audio sessions
4. Menstrual recording and pattern awareness
5. Emotional-wellbeing check-ins and private notes
6. Contextual, clinically reviewed answers
7. Safety triage and accountable human escalation
8. Counsellor identity, eligibility, presence, quality, and supervision
9. Privacy, discretion, consent, export, and deletion controls
10. Multilingual text, code-switching, and accessible audio

### 6.2 Supported but not product-defining

- Basic pregnancy-question guidance
- Recording a reported pregnancy so menstrual predictions do not contradict it
- Referral for pregnancy-related care
- Recognition of urgent pregnancy symptoms
- Basic symptom and medication reminders

### 6.3 Deferred

- Detailed fertility planning
- Conception optimization
- Detailed pregnancy-week or fetal-development experiences
- Postpartum programmes
- Social feeds
- Unmoderated peer communities
- Gamification, streaks, points, or sensitive-health rewards
- Large general-purpose article catalogues
- Advertising based on health or conversation data
- Blockchain integration without a necessary and validated member benefit

### 6.4 Explicitly out of scope

- Medical diagnosis
- Prescribing or changing medication
- Replacing emergency services
- Guaranteed prevention of self-harm or abuse
- Covert monitoring by parents, schools, employers, or partners
- Sharing member identity with counsellors by default
- Direct counsellor contact outside SisterCare
- Public member profiles
- Sale of identifiable or sensitive health data

## 7. Information architecture

### 7.1 Member navigation

The member product has four primary destinations.

#### Home

- Primary `Talk privately now` action
- Active or waiting counsellor session
- Optional wellbeing check-in
- Compact menstrual summary
- Important member-approved follow-up
- Setup continuation when configuration is incomplete

#### Talk

- Start a new private assistant conversation
- Request an anonymous counsellor chat
- Request or schedule an in-app audio call
- View member-retained conversation history
- Delete or stop saving eligible conversations

#### Track

- Record or correct period dates
- Record flow, pain, and menstrual symptoms
- Record mood, sleep, stress, and energy
- Add a private note
- View simple patterns without diagnostic claims

#### You

- Alias and communication preferences
- Language and accessibility
- Discreet notifications and application lock
- Consent and counsellor-sharing controls
- Conversation retention controls
- Export and delete data
- Help, complaints, and safety information

Existing member routes may remain during migration, but duplicate dashboards
must not remain permanent sources of conflicting state.

### 7.2 Counsellor workspace

Counsellors use a separate professional interface containing:

- verified identity and credential status;
- availability, shift, capacity, and connection status;
- incoming requests and waiting-time severity;
- assigned, active, and follow-up sessions;
- only the context the member consented to share;
- structured notes with appropriate access controls;
- safeguarding and supervisor escalation;
- incident and complaint reporting; and
- clinically reviewed knowledge contribution.

Counsellors must never receive member navigation or member-only pages.

### 7.3 Administrative workspace

Administrators use a separate operational interface containing:

- counsellor KYC and credential review;
- role and access governance;
- counsellor availability and capacity;
- safeguarding eligibility and supervision;
- clinical-content review;
- crisis service levels and unresolved incidents;
- privacy-safe service health;
- complaint handling;
- audit review; and
- jurisdiction configuration.

Administrative access must fail closed and remain independent of member
navigation.

## 8. Functional requirements

### FR-1. Fast private entry

1. A new member can reach a conversation with no more than essential
   authentication, age-band, language, privacy, and safety notices.
2. Optional cycle and wellbeing setup can be skipped and resumed reliably.
3. Skipping onboarding persists across refresh, logout, login, and devices.
4. Setup notices always navigate to a resumable setup screen.

**Acceptance:** A member who skips setup reaches Home once and is not trapped
in an onboarding redirect loop.

### FR-2. Alias-based member identity

1. Every member receives or chooses a non-identifying display alias.
2. Counsellor-facing records use the alias and an opaque participant ID.
3. Legal name, email, phone, and precise location are not shown to counsellors.
4. Administrators receive identifying data only when their role and task
   require it.

**Acceptance:** A counsellor inspecting a normal session cannot retrieve the
member's authentication email or phone through the interface or API.

### FR-3. New private conversation

1. Opening Talk begins with a blank new conversation.
2. The composer contains no text from another conversation.
3. A saved conversation receives a meaningful title after its first exchange.
4. Selecting history loads all authorized messages in order.
5. Drafts are isolated by conversation ID and device.
6. The member can choose whether an eligible conversation is retained.

**Acceptance:** Creating, logging out, logging in, and reopening a retained
conversation preserves its title and messages without contaminating a new
draft.

### FR-4. Assistant behavior

1. The assistant uses only authorized member context.
2. It respects the explicitly selected language until the member changes it.
3. It does not silently switch language based on one message.
4. It distinguishes information, suggested action, confirmed action, and
   urgent guidance.
5. It cannot report action success without a verified tool result.
6. It offers a human counsellor when asked without forcing unnecessary
   disclosure.
7. It does not present itself as a human counsellor.
8. It provides complete responses or explicitly reports interruption.

**Acceptance:** Automated evaluations cover memory, language stability,
action-result integrity, refusal boundaries, non-judgment, and escalation.

### FR-5. Counsellor request

1. A member can request human chat from Home or Talk.
2. The request may specify language, topic, counsellor preference, and urgency.
3. Matching considers KYC, credential validity, training, availability, shift,
   active capacity, language, specialty, and recent presence.
4. Critical cases require configured crisis eligibility.
5. The member sees truthful waiting, matched, accepted, active, completed, and
   unavailable states.
6. The member may leave the screen without losing the request.

**Acceptance:** Concurrent requests cannot assign one counsellor beyond
capacity, and offline or ineligible counsellors cannot be assigned.

### FR-6. Anonymous text session

1. Session messages are visible only to the member, assigned counsellor, and
   explicitly authorized safety or supervisory personnel.
2. Messages expose no hidden account identity to the counsellor.
3. Delivery state is server-confirmed.
4. Reconnect retrieves missing messages without duplication.
5. Blocking, reporting, ending, and requesting another counsellor are
   available.
6. Session retention and access duration follow configured policy.

**Acceptance:** Row-level and server authorization tests prevent unrelated
members, counsellors, and administrators without operational need from reading
messages.

### FR-7. Anonymous audio session

1. Calls occur in-app without revealing either telephone number.
2. Audio-only is the default.
3. Recording is off by default and cannot be enabled without explicit,
   jurisdiction-valid consent.
4. Connection failure offers text continuation or scheduling.
5. Call state and duration are recorded without recording content.
6. Safety controls allow either participant to end and report the call.

**Acceptance:** Network degradation never exposes phone details or falsely
displays an active call.

### FR-8. Menstrual tracking

1. Members can add, edit, or remove period dates.
2. Predictions identify uncertainty and are not presented as contraception.
3. The tracker handles missing and irregular data without false precision.
4. Members can record pain, flow, and impact on school, work, sleep, or daily
   activity.
5. Concerning patterns offer reviewed guidance and optional human support.
6. Reported pregnancy pauses contradictory menstrual predictions while
   preserving historical data.

**Acceptance:** Date calculations are timezone-safe and tested across month,
year, leap-day, and irregular-cycle boundaries.

### FR-9. Emotional-wellbeing tracking

1. Check-ins are optional and non-gamified.
2. Members can record mood, stress, sleep, energy, and a private note.
3. SisterCare may show simple member-readable patterns.
4. The product does not infer a diagnosis from unvalidated tracking.
5. Concerning responses run the governed safety pathway.
6. Members control whether a counsellor receives a summary.

**Acceptance:** A pattern insight states its evidence and uncertainty and
cannot label a member with a mental-health condition.

### FR-10. Contextual knowledge

1. Search and conversation retrieve short, reviewed answers before long-form
   content.
2. Every health answer records source, clinical reviewer, review date, locale,
   and next review date.
3. Expired or unapproved content is not presented as clinically reviewed.
4. Counsellor submissions remain private until editorial approval.
5. Existing articles remain accessible during migration and may be converted
   to contextual answer cards.

**Acceptance:** Production health content cannot be published without a valid
review record.

### FR-11. Discreet notifications

1. Notification previews are neutral by default.
2. Sensitive topic, symptom, counsellor, and message content never appears on
   a lock screen by default.
3. Members can disable categories and previews.
4. Shared-device mode requires re-entry authentication after a configured
   idle period.

**Acceptance:** Snapshot tests verify that sensitive fixture data is absent
from notification payloads.

### FR-12. Privacy controls

1. Members can view what information SisterCare holds.
2. Members can export their data in a documented format.
3. Members can request deletion with clear legal-retention exceptions.
4. Members can delete eligible conversation history independently.
5. Access to sensitive records is audited.
6. Product analytics excludes raw conversation and health content.

**Acceptance:** Account deletion removes or anonymizes all eligible records and
reports partial failure without claiming completion.

### FR-13. Complaints and safeguarding

1. Members can report a counsellor, message, call, or assistant response.
2. Reports create an accountable case with severity and owner.
3. High-severity cases notify the configured operational team.
4. Counsellors can escalate safety concerns without obtaining member identity
   by default.
5. Counsellor contact requests outside SisterCare are prohibited and
   reportable.

**Acceptance:** Every critical report has an owner, timestamp, status, and
resolution audit.

### FR-14. Localized support

1. Interface and conversation language are separate explicit preferences.
2. Language selection persists across sessions and devices.
3. Local-language health terminology uses a reviewed glossary.
4. Low-confidence translation may provide a bilingual response or human
   handoff.
5. Voice input failure preserves the option to type.

**Acceptance:** Native-speaker evaluation must pass the release threshold for
comprehension, respect, completeness, and safety.

### FR-15. Offline and low-bandwidth behavior

1. The application shell, eligible reviewed answers, drafts, and tracking
   remain available after a prior successful load.
2. Offline writes are queued with idempotency keys.
3. Synchronization reports conflict instead of silently overwriting data.
4. Text is preferred over media on constrained networks.
5. Failed audio sessions fall back to messaging or scheduling.

**Acceptance:** Tested offline entries synchronize once without duplication
after reconnection.

## 9. Safety requirements

### 9.1 Risk levels

SisterCare maintains clinically approved deterministic categories for:

- immediate danger or possible self-harm;
- abuse, exploitation, or coercion;
- severe physical symptoms;
- high emotional distress;
- routine support; and
- non-health or unsupported requests.

Models may add context but cannot lower deterministic severity.

### 9.2 Crisis experience

The response must:

1. acknowledge the disclosure without judgment;
2. avoid overwhelming the member with text;
3. ask only safety-critical questions;
4. offer an eligible human connection;
5. show validated, jurisdiction-appropriate urgent options;
6. avoid unsafe promises of secrecy;
7. create an operationally owned escalation where policy permits; and
8. remain usable if the model provider fails.

Emergency contacts must come from a maintained jurisdiction registry. They
must never be embedded as globally valid constants.

### 9.3 Clinical governance

Changes affecting triage, crisis language, medical thresholds, validated
screening, or emergency guidance require:

- a named clinical reviewer;
- a documented evidence source;
- a versioned approval;
- safety tests;
- rollback capability; and
- post-release monitoring.

## 10. AI requirements

### 10.1 Permitted responsibilities

- Understand conversational intent
- Retrieve authorized context
- Explain reviewed information
- Help the member express a concern
- Propose a bounded product action
- Summarize selected context for a counsellor with consent
- Translate or simplify within evaluated language capability

### 10.2 Prohibited responsibilities

- Determine identity or authorization
- Diagnose a condition
- Independently change crisis severity downward
- Invent counsellor availability
- Claim an unverified operation succeeded
- Disclose records without consent and authorization
- Make final KYC, complaint, safeguarding, or clinical decisions

### 10.3 Required pipeline

```text
authenticate
  -> authorize
  -> load minimum permitted context
  -> apply language preference
  -> deterministic safety assessment
  -> retrieve reviewed knowledge
  -> plan response or bounded action
  -> validate action and consent
  -> execute
  -> verify result
  -> compose complete response
  -> persist according to retention choice
  -> audit consequential events
```

### 10.4 Provider independence

Groq, Gemini, or another approved provider may generate language, but no
provider owns SisterCare's memory, authorization, safety policy, or business
state. Provider failure must degrade to safe deterministic guidance and human
support options.

## 11. Data and authorization

### 11.1 Data domains

- Authentication identity
- Member alias and preferences
- Consent and sharing grants
- Conversations and retention policy
- Menstrual records
- Emotional-wellbeing records
- Counsellor applications and KYC
- Counsellor eligibility and presence
- Counselling sessions and messages
- Call metadata
- Clinically reviewed knowledge
- Complaints and safety incidents
- Audit events
- Privacy-safe operational metrics

### 11.2 Access rules

- Browser access uses participant-scoped row-level security.
- Server routes verify the bearer token and application role.
- Roles come from server-controlled profile state.
- Counsellors receive only assigned-session information.
- Administrators do not receive blanket message access merely because they are
  administrators.
- Break-glass access, if legally required, is explicit, time-limited,
  reason-bound, and audited.
- Service keys never reach client code.

### 11.3 Retention

Retention periods must be configured by data category and jurisdiction.
Conversation, counselling, incident, KYC, and audit data may require different
policies. The interface must communicate applicable choices and exceptions.

## 12. Non-functional requirements

### Security

- Fail closed on missing identity, role, configuration, or consent
- Row-level security on every exposed table
- Encryption in transit and at rest
- Rate limits and abuse controls
- Secret rotation and dependency monitoring
- Independent security review before broad public launch

### Reliability

- 99.9% monthly target for core authenticated reading and messaging after
  production launch
- Idempotent message, tracking, and session-transition writes
- No acknowledged write may disappear after refresh
- Provider failure must not disable deterministic safety responses
- Backups and tested restoration for production data

### Performance

- Primary mobile route usable within 3 seconds on a representative constrained
  network after authentication
- Visible response to touch within 100 milliseconds
- No input font below 16px on mobile browsers
- Chat composer remains reachable above browser and application navigation

### Accessibility

- WCAG 2.2 AA target
- Keyboard and screen-reader support
- Visible focus and sufficient contrast
- Text alternatives for audio
- Reduced-motion support
- Plain-language error recovery

### Scalability

- Prefer a modular monolith until measured load requires service extraction
- Atomic database operations for matching, limits, and state transitions
- Paginated conversation, message, incident, and content queries
- Realtime subscriptions scoped by participant
- Operational work must not depend on sub-minute paid cron execution

### Observability

- Structured request outcomes without raw health content
- Privacy-safe correlation identifiers
- Authentication, authorization, provider, database, and safety metrics
- Alerting for message loss, matching delay, crisis SLA, and access anomalies
- Actionable JSON errors from every API route

## 13. Success measures

### North-star outcome

**Percentage of members who report that SisterCare helped them safely express a
concern and identify or complete an appropriate next step.**

### Product measures

- Time to first meaningful response
- Time to requested human support
- Successful counsellor match rate
- Session acceptance and completion
- Member-reported feeling heard
- Member-reported absence of judgment
- Member understanding of the next step
- Follow-up completion
- Menstrual record correction rate
- Language comprehension and translation safety
- Offline synchronization success

### Safety and trust measures

- Critical escalation time
- False reassurance incidents
- Incorrect assistant-action claims
- Unauthorized access attempts and successful breaches
- Counsellor boundary violations
- Complaint resolution time
- Content past its clinical review date
- Notification privacy failures
- Data deletion completion and failure rate

### Guardrail measures

- Do not optimize streaks
- Do not optimize raw time spent
- Do not increase notifications solely to drive opens
- Do not count messages as successful care without an outcome signal

## 14. Compatibility and migration

The product must evolve without breaking current members, counsellors, or
administrators.

### Migration rules

1. Establish baseline tests before changing behavior.
2. Introduce new data fields as additive and nullable.
3. Backfill or derive state before making fields required.
4. Put replacement experiences behind explicit rollout controls where risk is
   significant.
5. Preserve old routes with redirects or compatibility views.
6. Keep existing pregnancy and fertility records readable and exportable.
7. Stop creating deprecated data before removing its readers.
8. Never delete member data merely because a feature leaves navigation.
9. Validate one member, counsellor, and administrator journey before each
   production rollout.
10. Remove old schema only after migration, observation, rollback expiry, and
    explicit approval.

## 15. Delivery roadmap

Each increment must be independently tested and committed with a single-line
commit message.

### Phase 0: Product alignment

- Adopt this PRD
- Update public and developer-facing product language
- Inventory existing routes and features against the disposition table
- Establish mission-alignment regression tests

### Phase 1: Safe member foundation

- Add alias and privacy-preference model
- Repair resumable onboarding
- Add discreet notification defaults
- Consolidate member navigation around Home, Talk, Track, and You
- Preserve legacy route compatibility

### Phase 2: Private conversation

- Add conversation-retention choices
- Isolate drafts by conversation
- Add complete history and deletion behavior
- Make language selection authoritative
- Add report-response capability

### Phase 3: Human text care

- Remove member identity from counsellor session views
- Add consent-scoped handoff summaries
- Strengthen truthful session delivery states
- Add blocking, reporting, reassignment, and follow-up
- Add supervisor workflow

### Phase 4: Menstrual and emotional tracking

- Simplify menstrual tracking
- Add non-gamified wellbeing check-ins
- Add private notes
- Add transparent pattern explanations
- Add member-controlled counsellor sharing

### Phase 5: Contextual knowledge

- Add reviewed answer-card model
- Convert high-value existing content
- Add review expiry and locale governance
- De-emphasize the general library in member navigation

### Phase 6: Anonymous audio

- Select a privacy-appropriate realtime audio provider
- Add number-masked in-app audio
- Add call consent, state, safety, and fallback
- Add operational quality monitoring without content recording

### Phase 7: Low-connectivity reliability

- Add offline drafts and tracking queue
- Add idempotent synchronization
- Add conflict recovery
- Optimize mobile bundles and network use

### Phase 8: Launch governance

- Complete jurisdiction legal and safeguarding review
- Validate local emergency and referral registry
- Complete clinical and native-language evaluations
- Complete security and privacy review
- Run supervised pilot
- Review guardrails before wider release

## 16. Release gates

A release cannot proceed when:

- a critical safety test fails;
- a protected route fails open;
- a counsellor can see unnecessary member identity;
- a message or record acknowledges success and then disappears;
- a critical API returns non-actionable or non-JSON failure;
- local-language safety evaluation is below threshold;
- emergency information is unverified for the launch jurisdiction;
- an unresolved high-severity privacy incident exists; or
- rollback has not been tested for a high-risk migration.

## 17. Product decisions requiring explicit approval

The following cannot be silently chosen by engineering:

- Launch countries and age bands
- Whether and when parental consent is required
- Mandatory-reporting policy
- Exact conversation and counselling-record retention
- Whether pseudonymous use without email is supported
- Counsellor disciplines permitted to handle each topic
- Audio provider and recording policy
- Validated mental-health screening instruments
- Paid session and subsidy model
- Institutional reporting boundaries

## 18. Definition of done

A feature is complete only when:

- it solves the stated member or operational outcome;
- design covers mobile, loading, empty, offline, error, and recovery states;
- authorization and privacy are tested;
- accessibility is verified;
- analytics contain no sensitive content;
- clinical or safeguarding review is recorded when required;
- automated tests cover the critical behavior;
- existing member, counsellor, and admin journeys remain functional;
- deployment and rollback instructions are documented; and
- the change is committed independently with a one-line message.
