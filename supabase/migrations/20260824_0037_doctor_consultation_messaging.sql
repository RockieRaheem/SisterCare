create table public.doctor_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.doctor_appointments(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('member', 'doctor')),
  text text not null check (char_length(text) between 1 and 2000),
  client_message_id text not null check (char_length(client_message_id) between 8 and 120),
  created_at timestamptz not null default now(),
  unique (appointment_id, sender_id, client_message_id)
);

create index doctor_messages_appointment_created_idx
  on public.doctor_messages (appointment_id, created_at);

alter table public.doctor_messages enable row level security;
revoke all on public.doctor_messages from anon, authenticated;
grant all privileges on public.doctor_messages to service_role;

alter table public.care_notifications
  drop constraint if exists care_notifications_event_type_check;
alter table public.care_notifications
  add constraint care_notifications_event_type_check check (event_type in (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued'
  ));

create or replace function public.create_doctor_appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.doctor_id is not null then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (new.doctor_id, 'doctor_request', 'doctor:' || new.id || ':requested', jsonb_build_object('href', '/doctor?appointment=' || new.id))
    on conflict (event_key) do nothing;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (new.member_id, 'doctor_status', 'doctor:' || new.id || ':status:' || new.status, jsonb_build_object('href', '/doctors/appointments/' || new.id, 'status', new.status))
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.create_doctor_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recipient uuid;
begin
  select case when new.sender_id = appointment.member_id then appointment.doctor_id else appointment.member_id end
  into recipient from public.doctor_appointments appointment where appointment.id = new.appointment_id;
  if recipient is not null then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (recipient, 'doctor_message', 'doctor-message:' || new.id, jsonb_build_object(
      'href', case when new.sender_role = 'member' then '/doctor?appointment=' || new.appointment_id else '/doctors/appointments/' || new.appointment_id end
    )) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.create_prescription_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
  values (new.member_id, 'prescription_issued', 'prescription:' || new.id, jsonb_build_object('href', '/doctors/appointments/' || new.appointment_id))
  on conflict (event_key) do nothing;
  return new;
end;
$$;

create trigger doctor_appointment_notifications
after insert or update of status on public.doctor_appointments
for each row execute function public.create_doctor_appointment_notifications();

create trigger doctor_message_notifications
after insert on public.doctor_messages
for each row execute function public.create_doctor_message_notification();

create trigger prescription_notifications
after insert on public.doctor_prescriptions
for each row execute function public.create_prescription_notification();
