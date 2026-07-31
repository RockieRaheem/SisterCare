-- Store call state and duration only. Audio recording content and participant
-- phone numbers are deliberately absent from this schema.
create table if not exists public.session_audio_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.counselling_sessions(id) on delete cascade,
  state text not null check (state in ('connecting', 'active', 'ended', 'failed')),
  initiated_by uuid not null references public.profiles(id) on delete restrict,
  provider_room_id text not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists session_audio_calls_updated_at on public.session_audio_calls;
create trigger session_audio_calls_updated_at
  before update on public.session_audio_calls
  for each row execute function public.set_updated_at();

alter table public.session_audio_calls enable row level security;

create policy "audio state participant read"
  on public.session_audio_calls for select
  using (
    exists (
      select 1 from public.counselling_sessions session
      where session.id = session_audio_calls.session_id
        and (session.user_id = auth.uid() or session.counsellor_id = auth.uid())
    )
  );

grant select on public.session_audio_calls to authenticated;
