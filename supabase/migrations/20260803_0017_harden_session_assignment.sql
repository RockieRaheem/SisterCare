-- Keep the final counsellor claim fail-closed if operations change between
-- candidate ranking and the atomic database update.
create or replace function public.claim_counselling_session(
  target_session_id uuid,
  target_counsellor_id uuid,
  target_counsellor_name text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_counsellor uuid;
begin
  update public.counsellors
  set status = 'in_session',
      last_heartbeat = now(),
      updated_at = now()
  where id = target_counsellor_id
    and status = 'available'
    and verification_status = 'verified'
    and accepting_new_sessions = true
    and last_heartbeat >= now() - interval '120 seconds'
  returning id into claimed_counsellor;

  if claimed_counsellor is null then
    return false;
  end if;

  update public.counselling_sessions
  set state = 'matched',
      counsellor_id = target_counsellor_id,
      matched_at = now(),
      match_attempts = match_attempts + 1,
      details = jsonb_set(
        details,
        '{counsellorName}',
        to_jsonb(coalesce(target_counsellor_name, 'Counsellor')),
        true
      ),
      updated_at = now()
  where id = target_session_id
    and state = 'requested'
    and (
      not (details ? 'preferredCounsellorId')
      or details ->> 'preferredCounsellorId' = target_counsellor_id::text
    );

  if not found then
    update public.counsellors
    set status = 'available', updated_at = now()
    where id = target_counsellor_id;
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.claim_counselling_session(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_counselling_session(uuid, uuid, text)
  to service_role;
