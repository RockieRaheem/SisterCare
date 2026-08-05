-- Keep the member-facing counsellor rating synchronized with authoritative
-- completed-session feedback. The KYC application remains immutable.

create or replace function public.recalculate_counsellor_rating(
  target_counsellor_id uuid
)
returns table (average_rating numeric, total_reviews bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  calculated_rating numeric := 0;
  calculated_count bigint := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(target_counsellor_id::text, 0)
  );

  select
    coalesce(round(avg((details ->> 'feedbackRating')::numeric), 2), 0),
    count(*)
  into calculated_rating, calculated_count
  from public.counselling_sessions
  where counsellor_id = target_counsellor_id
    and state = 'feedback_received'
    and jsonb_typeof(details -> 'feedbackRating') = 'number'
    and (details ->> 'feedbackRating')::numeric between 1 and 5;

  update public.counsellors
  set profile = jsonb_set(
    jsonb_set(
      coalesce(profile, '{}'::jsonb),
      '{rating}',
      to_jsonb(calculated_rating),
      true
    ),
    '{reviewCount}',
    to_jsonb(calculated_count),
    true
  )
  where id = target_counsellor_id;

  return query select calculated_rating, calculated_count;
end;
$$;

revoke all on function public.recalculate_counsellor_rating(uuid)
from public, anon, authenticated;
grant execute on function public.recalculate_counsellor_rating(uuid)
to service_role;

create or replace function public.sync_counsellor_rating_from_feedback()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.counsellor_id is not null
    and new.state = 'feedback_received'
    and (
      old.state is distinct from new.state
      or old.details -> 'feedbackRating'
        is distinct from new.details -> 'feedbackRating'
    )
  then
    perform public.recalculate_counsellor_rating(new.counsellor_id);
  end if;
  return new;
end;
$$;

drop trigger if exists counselling_session_rating_sync
on public.counselling_sessions;
create trigger counselling_session_rating_sync
after update of state, details on public.counselling_sessions
for each row execute function public.sync_counsellor_rating_from_feedback();

do $$
declare
  counsellor_record record;
begin
  for counsellor_record in
    select id from public.counsellors
  loop
    perform public.recalculate_counsellor_rating(counsellor_record.id);
  end loop;
end;
$$;
