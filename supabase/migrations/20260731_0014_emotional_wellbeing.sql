-- Wellbeing check-ins are separate from menstrual symptom records so members
-- can reflect without implying a diagnosis or a cycle-related cause.
alter table public.user_records
  drop constraint if exists user_records_record_type_check;

alter table public.user_records
  add constraint user_records_record_type_check
  check (
    record_type in (
      'symptom',
      'cycle_history',
      'reminder',
      'agent_event',
      'wellbeing'
    )
  );
