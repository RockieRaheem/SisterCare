-- Members can withdraw a queued or matched request without waiting for a
-- counsellor timeout. Active care still ends through the completed state.
alter table public.counselling_sessions
  drop constraint if exists counselling_sessions_state_check;

alter table public.counselling_sessions
  add constraint counselling_sessions_state_check
  check (
    state in (
      'requested',
      'matched',
      'accepted',
      'active',
      'completed',
      'feedback_received',
      'expired',
      'escalated',
      'cancelled'
    )
  );
