-- Private member reports and the accountable administrator review queue.
create table if not exists public.member_concern_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('ai_response', 'counsellor', 'session', 'message', 'privacy', 'technical', 'other')),
  target_id text check (target_id is null or char_length(target_id) <= 160),
  category text not null check (category in ('unsafe_advice', 'harassment', 'privacy', 'incorrect_information', 'access_problem', 'other')),
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists member_concern_reports_status_created_idx
  on public.member_concern_reports (status, created_at desc);
create index if not exists member_concern_reports_reporter_created_idx
  on public.member_concern_reports (reporter_id, created_at desc);

drop trigger if exists member_concern_reports_updated_at on public.member_concern_reports;
create trigger member_concern_reports_updated_at
before update on public.member_concern_reports
for each row execute function public.set_updated_at();

alter table public.member_concern_reports enable row level security;
revoke all on public.member_concern_reports from anon, authenticated;

comment on table public.member_concern_reports is
  'Private reports submitted by members and reviewed only through authenticated server workflows.';
