-- Durable, privacy-minimized care events survive closed tabs, new devices,
-- and realtime socket failures. Message text is never copied here.
create table if not exists public.care_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.counselling_sessions(id) on delete cascade,
  event_type text not null check (event_type in (
    'session_assigned',
    'session_accepted',
    'session_rematching',
    'session_cancelled',
    'session_completed',
    'session_escalated',
    'session_message'
  )),
  event_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists care_notifications_recipient_unread_idx
  on public.care_notifications (recipient_id, created_at desc)
  where read_at is null;

create or replace function public.create_session_state_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state = 'matched' and old.state is distinct from 'matched' and new.counsellor_id is not null then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (new.counsellor_id, new.id, 'session_assigned', 'session:' || new.id || ':assigned:' || new.counsellor_id)
    on conflict (event_key) do nothing;
  end if;

  if new.state = 'active' and old.state is distinct from 'active' then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (new.user_id, new.id, 'session_accepted', 'session:' || new.id || ':accepted')
    on conflict (event_key) do nothing;
  end if;

  if new.state = 'requested' and old.state = 'matched' then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (new.user_id, new.id, 'session_rematching', 'session:' || new.id || ':rematch:' || extract(epoch from now())::bigint)
    on conflict (event_key) do nothing;
  end if;

  if new.state = 'cancelled' and old.state is distinct from 'cancelled' and old.counsellor_id is not null then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (old.counsellor_id, new.id, 'session_cancelled', 'session:' || new.id || ':cancelled')
    on conflict (event_key) do nothing;
  end if;

  if new.state = 'completed' and old.state is distinct from 'completed' then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (new.user_id, new.id, 'session_completed', 'session:' || new.id || ':completed:member')
    on conflict (event_key) do nothing;
  end if;

  if new.state = 'escalated' and old.state is distinct from 'escalated' then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (new.user_id, new.id, 'session_escalated', 'session:' || new.id || ':escalated:member')
    on conflict (event_key) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.create_session_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select case
    when new.sender_id = session.user_id then session.counsellor_id
    else session.user_id
  end into recipient
  from public.counselling_sessions session
  where session.id = new.session_id;

  if recipient is not null then
    insert into public.care_notifications (recipient_id, session_id, event_type, event_key)
    values (recipient, new.session_id, 'session_message', 'message:' || new.id)
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists counselling_session_notifications on public.counselling_sessions;
create trigger counselling_session_notifications
after update of state, counsellor_id on public.counselling_sessions
for each row execute function public.create_session_state_notifications();

drop trigger if exists session_message_notifications on public.session_messages;
create trigger session_message_notifications
after insert on public.session_messages
for each row execute function public.create_session_message_notification();

alter table public.care_notifications enable row level security;
revoke all on public.care_notifications from anon, authenticated;
grant all privileges on public.care_notifications to service_role;
