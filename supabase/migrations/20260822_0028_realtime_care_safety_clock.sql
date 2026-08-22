-- Run safety deadlines inside Postgres so Vercel Hobby's daily cron limit
-- cannot delay crisis fallback, incident creation, or abandoned matches.
create extension if not exists pg_cron;

create or replace function public.run_care_safety_clock()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  fallback_count integer := 0;
  incident_count integer := 0;
  rematch_count integer := 0;
  expiry_count integer := 0;
begin
  with changed as (
    update public.counselling_sessions
    set details = jsonb_set(
          jsonb_set(
            coalesce(details, '{}'::jsonb),
            '{emergencyFallbackRequired}',
            'true'::jsonb,
            true
          ),
          '{crisisEscalationLevel}',
          '3'::jsonb,
          true
        ) || jsonb_build_object('lastCrisisEscalationAt', now()),
        updated_at = now()
    where priority = 'critical'
      and state in ('requested', 'matched')
      and requested_at <= now() - interval '5 minutes'
      and coalesce((details ->> 'crisisEscalationLevel')::integer, 0) < 3
    returning id
  )
  select count(*) into fallback_count from changed;

  with due as (
    select id, greatest(0, extract(epoch from (now() - requested_at))::integer) as waiting_seconds
    from public.counselling_sessions
    where priority = 'critical'
      and state in ('requested', 'matched')
      and requested_at <= now() - interval '10 minutes'
  ), inserted as (
    insert into public.incidents (
      id,
      type,
      severity,
      status,
      session_id,
      waiting_seconds_at_open,
      updated_at
    )
    select
      'crisis-' || due.id::text,
      'crisis_sla_breach',
      'critical',
      'open',
      due.id,
      due.waiting_seconds,
      now()
    from due
    on conflict (id) do nothing
    returning session_id
  )
  select count(*) into incident_count from inserted;

  update public.counselling_sessions
  set details = jsonb_set(
        jsonb_set(
          coalesce(details, '{}'::jsonb),
          '{incidentRequired}',
          'true'::jsonb,
          true
        ),
        '{crisisEscalationLevel}',
        '4'::jsonb,
        true
      ) || jsonb_build_object('lastCrisisEscalationAt', now()),
      updated_at = now()
  where priority = 'critical'
    and state in ('requested', 'matched')
    and requested_at <= now() - interval '10 minutes'
    and coalesce((details ->> 'crisisEscalationLevel')::integer, 0) < 4;

  with stale as (
    update public.counselling_sessions
    set state = 'requested',
        declined_by = case
          when counsellor_id is null then declined_by
          when counsellor_id = any(declined_by) then declined_by
          else array_append(declined_by, counsellor_id)
        end,
        details = (coalesce(details, '{}'::jsonb) - 'counsellorName') ||
          jsonb_build_object(
            'lastDeclinedAt', now(),
            'lastDeclineReason', 'acceptance_timeout'
          ),
        counsellor_id = null,
        matched_at = null,
        updated_at = now()
    where state = 'matched'
      and matched_at <= now() - interval '10 minutes'
    returning id
  )
  select count(*) into rematch_count from stale;

  with expired as (
    update public.counselling_sessions
    set state = 'expired',
        completed_at = now(),
        updated_at = now()
    where state = 'requested'
      and priority <> 'critical'
      and requested_at <= now() - interval '24 hours'
    returning id
  )
  select count(*) into expiry_count from expired;

  insert into public.operations_heartbeats (job, success, details, ran_at)
  values (
    'session_sweep',
    true,
    jsonb_build_object(
      'source', 'supabase_cron',
      'fallbacks', fallback_count,
      'incidents', incident_count,
      'rematched', rematch_count,
      'expired', expiry_count
    ),
    now()
  )
  on conflict (job) do update
  set success = excluded.success,
      details = excluded.details,
      ran_at = excluded.ran_at;

  return jsonb_build_object(
    'fallbacks', fallback_count,
    'incidents', incident_count,
    'rematched', rematch_count,
    'expired', expiry_count
  );
end;
$function$;

revoke all on function public.run_care_safety_clock() from public, anon, authenticated;
grant execute on function public.run_care_safety_clock() to service_role;

do $schedule$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'sistercare-care-safety-clock';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'sistercare-care-safety-clock',
    '* * * * *',
    'select public.run_care_safety_clock();'
  );
end;
$schedule$;

select public.run_care_safety_clock();
