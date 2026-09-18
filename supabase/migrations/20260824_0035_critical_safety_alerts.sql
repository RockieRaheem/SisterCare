-- Critical alerts are privacy-minimized durable notifications. They never
-- contain the member's message; authorised responders open the linked safety
-- workspace and follow the accountable incident workflow.
alter table public.care_notifications
  drop constraint if exists care_notifications_event_type_check;

alter table public.care_notifications
  add constraint care_notifications_event_type_check check (event_type in (
    'session_assigned',
    'session_accepted',
    'session_rematching',
    'session_cancelled',
    'session_completed',
    'session_escalated',
    'session_message',
    'follow_up_requested',
    'follow_up_started',
    'safety_alert'
  ));

create index if not exists incidents_type_opened_idx
  on public.incidents (type, opened_at desc);
