-- Daily rooms are provisioned before either participant joins. Tokens are
-- deliberately never stored; only privacy-safe room and lifecycle metadata is.
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

alter table public.session_audio_calls
  add column if not exists room_expires_at timestamptz,
  add column if not exists member_joined_at timestamptz,
  add column if not exists member_left_at timestamptz,
  add column if not exists counsellor_joined_at timestamptz,
  add column if not exists counsellor_left_at timestamptz;

create index if not exists session_audio_calls_expiry_idx
  on public.session_audio_calls (room_expires_at)
  where state in ('ready', 'connecting', 'active', 'disconnected');
