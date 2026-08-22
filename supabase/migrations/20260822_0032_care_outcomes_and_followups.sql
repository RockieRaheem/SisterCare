-- Measure whether care helped and turn requested or interrupted follow-up into
-- an owned work item rather than an untracked note.
create table if not exists public.care_outcomes (
  session_id uuid primary key references public.counselling_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  felt_heard text not null check (felt_heard in ('yes', 'partly', 'no', 'prefer_not')),
  next_step text not null check (next_step in ('clear', 'follow_up', 'referral', 'prefer_not')),
  follow_up_requested boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_followups (
  id uuid primary key default gen_random_uuid(),
  source_session_id uuid not null unique references public.counselling_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  assigned_counsellor_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('member_requested', 'session_interrupted', 'referral')),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed')),
  due_at timestamptz not null default (now() + interval '24 hours'),
  linked_session_id uuid references public.counselling_sessions(id) on delete set null,
  contacted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_followups_owner_due_idx
  on public.care_followups (assigned_counsellor_id, status, due_at);

alter table public.care_notifications
  drop constraint if exists care_notifications_event_type_check;
alter table public.care_notifications
  add constraint care_notifications_event_type_check check (event_type in (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started'
  ));

create or replace function public.create_interrupted_session_followup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state = 'escalated' and old.state is distinct from 'escalated' then
    insert into public.care_followups (
      source_session_id,
      member_id,
      assigned_counsellor_id,
      reason
    ) values (
      new.id,
      new.user_id,
      new.counsellor_id,
      'session_interrupted'
    ) on conflict (source_session_id) do nothing;

    if new.counsellor_id is not null then
      insert into public.care_notifications (
        recipient_id,
        session_id,
        event_type,
        event_key
      ) values (
        new.counsellor_id,
        new.id,
        'follow_up_requested',
        'follow-up:' || new.id || ':interrupted'
      ) on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists interrupted_session_followup on public.counselling_sessions;
create trigger interrupted_session_followup
after update of state on public.counselling_sessions
for each row execute function public.create_interrupted_session_followup();

alter table public.care_outcomes enable row level security;
alter table public.care_followups enable row level security;
revoke all on public.care_outcomes, public.care_followups from anon, authenticated;
grant all privileges on public.care_outcomes, public.care_followups to service_role;
