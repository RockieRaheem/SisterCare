-- Preserve the selected account path and repair profiles created before the
-- registration-intent trigger. This does not grant a privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    photo_url,
    registration_intent
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'registration_intent' = 'counsellor'
        then 'counsellor'
      else 'member'
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      photo_url = coalesce(public.profiles.photo_url, excluded.photo_url),
      registration_intent = case
        when public.profiles.registration_intent = 'counsellor'
          or excluded.registration_intent = 'counsellor'
          then 'counsellor'
        else 'member'
      end;
  return new;
end;
$$;

update public.profiles as profile
set registration_intent = 'counsellor',
    updated_at = now()
where profile.role <> 'admin'
  and (
    exists (
      select 1
      from public.counsellor_applications as application
      where application.counsellor_id = profile.id
    )
    or exists (
      select 1
      from auth.users as identity
      where identity.id = profile.id
        and identity.raw_user_meta_data ->> 'registration_intent' = 'counsellor'
    )
  );

update public.profiles as profile
set role = 'counsellor',
    registration_intent = 'counsellor',
    updated_at = now()
where profile.role = 'member'
  and exists (
    select 1
    from public.counsellors as counsellor
    where counsellor.id = profile.id
      and counsellor.verification_status = 'verified'
  );
