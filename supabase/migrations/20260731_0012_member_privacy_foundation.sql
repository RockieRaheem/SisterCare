-- Additive privacy controls for alias-based support. Existing identity,
-- tracking, and role fields remain unchanged for compatibility.
alter table public.profiles
  add column if not exists support_alias text,
  add column if not exists age_band text,
  add column if not exists privacy_preferences jsonb;

update public.profiles
set support_alias = 'SisterCare member'
where support_alias is null or char_length(trim(support_alias)) < 2;

update public.profiles
set privacy_preferences = jsonb_build_object(
  'conversationRetention', 'account',
  'counsellorContextSharing', 'ask_each_time',
  'discreetNotifications', true,
  'notificationPreviews', false,
  'sharedDeviceLockMinutes', 5
)
where privacy_preferences is null;

alter table public.profiles
  alter column support_alias set default 'SisterCare member',
  alter column support_alias set not null,
  alter column privacy_preferences set default '{
    "conversationRetention": "account",
    "counsellorContextSharing": "ask_each_time",
    "discreetNotifications": true,
    "notificationPreviews": false,
    "sharedDeviceLockMinutes": 5
  }'::jsonb,
  alter column privacy_preferences set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_support_alias_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_support_alias_length
      check (char_length(trim(support_alias)) between 2 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_age_band_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_age_band_allowed
      check (
        age_band is null
        or age_band in (
          'under_13',
          '13_15',
          '16_17',
          '18_24',
          '25_plus',
          'prefer_not_to_say'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_privacy_preferences_object'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_privacy_preferences_object
      check (jsonb_typeof(privacy_preferences) = 'object');
  end if;
end
$$;
