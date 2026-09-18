alter table public.doctor_prescriptions
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id) on delete set null,
  add column if not exists void_reason text not null default '' check (char_length(void_reason) <= 500);

alter table public.care_notifications
  drop constraint if exists care_notifications_event_type_check;
alter table public.care_notifications
  add constraint care_notifications_event_type_check check (event_type in (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued', 'prescription_voided', 'medical_safety_block'
  ));

create or replace function public.create_prescription_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (new.member_id, 'prescription_issued', 'prescription:' || new.id, jsonb_build_object('href', '/doctors/appointments/' || new.appointment_id))
    on conflict (event_key) do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'voided' and old.status is distinct from new.status then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (new.member_id, 'prescription_voided', 'prescription:' || new.id || ':voided', jsonb_build_object('href', '/doctors/appointments/' || new.appointment_id))
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists prescription_notifications on public.doctor_prescriptions;
create trigger prescription_notifications
after insert or update of status on public.doctor_prescriptions
for each row execute function public.create_prescription_notification();
