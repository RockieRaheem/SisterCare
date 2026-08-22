-- A serious case must have a named, currently on-duty administrator. The
-- service readiness gate fails closed when no safety responder is present.
create table if not exists public.safety_duty_roster (
  responder_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default false,
  started_at timestamptz,
  heartbeat_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.incidents
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists ownership_due_at timestamptz;

create index if not exists safety_duty_active_heartbeat_idx
  on public.safety_duty_roster (active, heartbeat_at desc);
create index if not exists incidents_owner_status_idx
  on public.incidents (assigned_to, status, opened_at desc);

create or replace function public.current_safety_owner()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select roster.responder_id
  from public.safety_duty_roster roster
  join public.profiles profile on profile.id = roster.responder_id
  where roster.active = true
    and roster.heartbeat_at >= now() - interval '3 minutes'
    and profile.role = 'admin'
  order by roster.started_at asc nulls last, roster.responder_id
  limit 1;
$$;

create or replace function public.assign_current_safety_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is null then
    new.assigned_to := public.current_safety_owner();
  end if;
  if tg_table_name = 'incidents' and new.ownership_due_at is null then
    new.ownership_due_at := now() + interval '2 minutes';
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_assign_safety_owner on public.incidents;
create trigger incidents_assign_safety_owner
before insert on public.incidents
for each row execute function public.assign_current_safety_owner();

drop trigger if exists reports_assign_safety_owner on public.member_concern_reports;
create trigger reports_assign_safety_owner
before insert on public.member_concern_reports
for each row execute function public.assign_current_safety_owner();

create or replace function public.set_safety_duty(
  target_responder uuid,
  target_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = target_responder and role = 'admin'
  ) then
    raise exception 'Administrator account required for safety duty';
  end if;

  insert into public.safety_duty_roster (
    responder_id,
    active,
    started_at,
    heartbeat_at,
    ended_at,
    updated_at
  ) values (
    target_responder,
    target_active,
    case when target_active then now() else null end,
    case when target_active then now() else null end,
    case when target_active then null else now() end,
    now()
  )
  on conflict (responder_id) do update
  set active = excluded.active,
      started_at = case
        when excluded.active and not public.safety_duty_roster.active then now()
        else public.safety_duty_roster.started_at
      end,
      heartbeat_at = case when excluded.active then now() else null end,
      ended_at = case when excluded.active then null else now() end,
      updated_at = now();

  if target_active then
    update public.incidents
    set assigned_to = target_responder,
        updated_at = now()
    where assigned_to is null and status in ('open', 'acknowledged');

    update public.member_concern_reports
    set assigned_to = target_responder,
        updated_at = now()
    where assigned_to is null and status in ('open', 'reviewing');
  end if;
end;
$$;

alter table public.safety_duty_roster enable row level security;
revoke all on public.safety_duty_roster from anon, authenticated;
revoke all on function public.current_safety_owner() from public, anon, authenticated;
revoke all on function public.set_safety_duty(uuid, boolean) from public, anon, authenticated;
grant all privileges on public.safety_duty_roster to service_role;
grant execute on function public.current_safety_owner() to service_role;
grant execute on function public.set_safety_duty(uuid, boolean) to service_role;
