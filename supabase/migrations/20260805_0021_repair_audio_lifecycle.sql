-- Idempotent repair for deployments that received the Daily integration
-- before the audio lifecycle migrations were applied.
create table if not exists public.session_audio_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique
    references public.counselling_sessions(id) on delete cascade,
  state text not null,
  initiated_by uuid not null references public.profiles(id) on delete restrict,
  provider_room_id text not null,
  room_expires_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0
    check (duration_seconds >= 0),
  failure_code text,
  member_joined_at timestamptz,
  member_left_at timestamptz,
  counsellor_joined_at timestamptz,
  counsellor_left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_audio_calls
  add column if not exists room_expires_at timestamptz,
  add column if not exists member_joined_at timestamptz,
  add column if not exists member_left_at timestamptz,
  add column if not exists counsellor_joined_at timestamptz,
  add column if not exists counsellor_left_at timestamptz;

alter table public.session_audio_calls
  drop constraint if exists session_audio_calls_state_check;

alter table public.session_audio_calls
  add constraint session_audio_calls_state_check
  check (
    state in (
      'ready',
      'connecting',
      'active',
      'disconnected',
      'ended',
      'failed',
      'cancelled',
      'expired'
    )
  );

drop trigger if exists session_audio_calls_updated_at
  on public.session_audio_calls;
create trigger session_audio_calls_updated_at
  before update on public.session_audio_calls
  for each row execute function public.set_updated_at();

alter table public.session_audio_calls enable row level security;

drop policy if exists "audio state participant read"
  on public.session_audio_calls;
create policy "audio state participant read"
  on public.session_audio_calls for select
  using (
    exists (
      select 1
      from public.counselling_sessions session
      where session.id = session_audio_calls.session_id
        and (
          session.user_id = auth.uid()
          or session.counsellor_id = auth.uid()
        )
    )
  );

grant select on public.session_audio_calls to authenticated;

create index if not exists session_audio_calls_expiry_idx
  on public.session_audio_calls (room_expires_at)
  where state in ('ready', 'connecting', 'active', 'disconnected');
