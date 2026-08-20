-- Repair environments created before emotional wellbeing records were added.
-- This migration is idempotent and preserves every existing user record.
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

create unique index if not exists user_records_daily_wellbeing_unique_idx
  on public.user_records (user_id, record_type, ((payload ->> 'localDate')))
  where record_type = 'wellbeing' and payload ? 'localDate';

alter table public.user_records enable row level security;

drop policy if exists "own record access" on public.user_records;
create policy "own record access"
  on public.user_records
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_records to authenticated;
