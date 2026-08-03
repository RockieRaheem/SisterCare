-- Enforce the participant and active-session boundary even for trusted
-- server writes, so a transport bug cannot cross rooms or write after care.
create or replace function public.enforce_active_session_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.counselling_sessions session
    where session.id = new.session_id
      and session.state = 'active'
      and (
        (new.sender_role = 'user' and session.user_id = new.sender_id)
        or
        (new.sender_role = 'counsellor' and session.counsellor_id = new.sender_id)
      )
  ) then
    raise exception 'message sender is not an active session participant';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_session_message
  on public.session_messages;
create trigger enforce_active_session_message
  before insert on public.session_messages
  for each row execute function public.enforce_active_session_message();
