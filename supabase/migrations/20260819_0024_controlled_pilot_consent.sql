-- Record explicit adult consent for the controlled pilot. Self-attestation
-- controls pilot eligibility; it does not change application roles.
alter table public.profiles
  add column if not exists adult_confirmed boolean not null default false,
  add column if not exists pilot_consent_version text,
  add column if not exists pilot_consent_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_adult_consent boolean :=
    coalesce(new.raw_user_meta_data ->> 'adult_confirmed', 'false') = 'true';
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    photo_url,
    registration_intent,
    adult_confirmed,
    pilot_consent_version,
    pilot_consent_at
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
    end,
    has_adult_consent,
    case when has_adult_consent then left(new.raw_user_meta_data ->> 'pilot_consent_version', 64) end,
    case when has_adult_consent then now() end
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
      end,
      adult_confirmed = public.profiles.adult_confirmed or excluded.adult_confirmed,
      pilot_consent_version = case
        when excluded.adult_confirmed then excluded.pilot_consent_version
        else public.profiles.pilot_consent_version
      end,
      pilot_consent_at = case
        when excluded.adult_confirmed then coalesce(public.profiles.pilot_consent_at, excluded.pilot_consent_at)
        else public.profiles.pilot_consent_at
      end;
  return new;
end;
$$;
