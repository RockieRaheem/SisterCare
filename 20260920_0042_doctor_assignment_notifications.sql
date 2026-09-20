-- Notify a doctor when a queued appointment is assigned after they come online.
create or replace function public.create_doctor_appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.doctor_id is not null then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (
      new.doctor_id,
      'doctor_request',
      'doctor:' || new.id || ':requested',
      jsonb_build_object('href', '/doctor?appointment=' || new.id)
    )
    on conflict (event_key) do nothing;
  elsif tg_op = 'UPDATE' and new.doctor_id is not null
    and old.doctor_id is distinct from new.doctor_id then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (
      new.doctor_id,
      'doctor_request',
      'doctor:' || new.id || ':assigned:' || new.doctor_id,
      jsonb_build_object('href', '/doctor?appointment=' || new.id)
    )
    on conflict (event_key) do nothing;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (
      new.member_id,
      'doctor_status',
      'doctor:' || new.id || ':status:' || new.status,
      jsonb_build_object('href', '/doctors/appointments/' || new.id, 'status', new.status)
    )
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists doctor_appointment_notifications on public.doctor_appointments;
create trigger doctor_appointment_notifications
after insert or update of doctor_id, status on public.doctor_appointments
for each row execute function public.create_doctor_appointment_notifications();