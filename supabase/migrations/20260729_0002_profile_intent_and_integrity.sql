-- Preserve the non-privileged sign-up path used to route a professional to
-- KYC. It is not an authorization role and never grants counsellor access.
alter table public.profiles
  add column registration_intent text not null default 'member'
  check (registration_intent in ('member', 'counsellor'));

create policy "profile self create" on public.profiles
  for insert with check (id = auth.uid() and role = 'member');

-- Updating role is deliberately not exposed to browser roles. The protected
-- server workflow uses the service role, which is not subject to RLS.
revoke update on public.profiles from anon, authenticated;
grant update (email, display_name, photo_url, onboarding_completed, preferences, cycle_data, pregnancy_data, registration_intent) on public.profiles to authenticated;

-- Keep a conversation's ordering and preview fresh when the authenticated
-- user adds a message. AI replies are added only by the server service role.
create or replace function public.touch_conversation_after_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set updated_at = now(),
         last_message = left(new.content, 100),
         message_count = message_count + 1
   where id = new.conversation_id;
  return new;
end; $$;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_after_message();

create policy "conversation owner adds own message" on public.messages
  for insert with check (
    sender = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "active session participant adds own message" on public.session_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.counselling_sessions s
      where s.id = session_id
        and s.state = 'active'
        and ((sender_role = 'user' and s.user_id = auth.uid())
          or (sender_role = 'counsellor' and s.counsellor_id = auth.uid()))
    )
  );
