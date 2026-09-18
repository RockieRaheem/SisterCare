alter table public.care_notifications
  drop constraint if exists care_notifications_event_type_check;
alter table public.care_notifications
  add constraint care_notifications_event_type_check check (event_type in (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued', 'medical_safety_block'
  ));
