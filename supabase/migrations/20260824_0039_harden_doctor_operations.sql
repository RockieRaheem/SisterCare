create or replace function public.create_doctor_appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.doctor_id is not null then
      insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
      values (new.doctor_id, 'doctor_request', 'doctor:' || new.id || ':requested', jsonb_build_object('href', '/doctor?appointment=' || new.id))
      on conflict (event_key) do nothing;
    else
      insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
      select profile.id, 'doctor_request', 'doctor:' || new.id || ':unassigned:' || profile.id, jsonb_build_object(
        'href', '/admin/doctors',
        'unassigned', true,
        'urgency', new.urgency
      )
      from public.profiles profile
      where profile.role = 'admin'
      on conflict (event_key) do nothing;
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.care_notifications (recipient_id, event_type, event_key, metadata)
    values (new.member_id, 'doctor_status', 'doctor:' || new.id || ':status:' || new.status, jsonb_build_object('href', '/doctors/appointments/' || new.id, 'status', new.status))
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;
