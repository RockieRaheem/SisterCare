-- Keep the chosen non-privileged registration path across email confirmation,
-- browser changes, and dashboard-created account recovery. It never grants a
-- counsellor role; KYC approval remains the sole elevation path.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, registration_intent)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.raw_user_meta_data ->> 'registration_intent' = 'counsellor' then 'counsellor' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;
