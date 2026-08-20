-- Prevent retried period updates from creating duplicate completed cycles.
create unique index if not exists user_records_cycle_history_boundary_unique
  on public.user_records (
    user_id,
    (payload ->> 'startDate'),
    (payload ->> 'endDate')
  )
  where record_type = 'cycle_history';
