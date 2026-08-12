-- One member can keep one editable wellbeing reflection for each local day.
-- Existing records without localDate remain valid and do not collide.
create unique index if not exists user_records_daily_wellbeing_unique_idx
  on public.user_records (user_id, record_type, ((payload ->> 'localDate')))
  where record_type = 'wellbeing' and payload ? 'localDate';
