-- Supabase-native operational state used by admin, safety, and observability.
create table if not exists public.incidents (
  id text primary key,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  session_id uuid references public.counselling_sessions(id) on delete set null,
  waiting_seconds_at_open integer not null default 0 check (waiting_seconds_at_open >= 0),
  opened_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text not null default '' check (char_length(resolution_note) <= 1000),
  updated_at timestamptz not null default now()
);
create index if not exists incidents_status_opened_idx on public.incidents (status, opened_at desc);

create table if not exists public.metrics_daily (
  date date primary key,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.operations_heartbeats (
  job text primary key check (job in ('session_sweep', 'availability_sync')),
  success boolean not null,
  details jsonb not null default '{}'::jsonb,
  ran_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0 check (count >= 0),
  window_started_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.library_articles
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz;

alter table public.counselling_sessions
  add column if not exists matched_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists active_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists time_to_human_seconds integer check (time_to_human_seconds is null or time_to_human_seconds >= 0),
  add column if not exists match_attempts integer not null default 0 check (match_attempts >= 0),
  add column if not exists declined_by uuid[] not null default '{}';

create or replace function public.increment_daily_metric(
  metric_date date,
  metric_name text,
  metric_value integer default 1
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if metric_name !~ '^[a-z0-9_]{1,120}$' then
    raise exception 'Invalid metric name';
  end if;
  insert into public.metrics_daily (date, metrics, updated_at)
  values (metric_date, jsonb_build_object(metric_name, metric_value), now())
  on conflict (date) do update
  set metrics = jsonb_set(
        public.metrics_daily.metrics,
        array[metric_name],
        to_jsonb(coalesce((public.metrics_daily.metrics ->> metric_name)::integer, 0) + metric_value),
        true
      ),
      updated_at = now();
end;
$$;

alter table public.incidents enable row level security;
alter table public.metrics_daily enable row level security;
alter table public.operations_heartbeats enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.incidents, public.metrics_daily, public.operations_heartbeats, public.rate_limits from anon, authenticated;
revoke all on function public.increment_daily_metric(date, text, integer) from public, anon, authenticated;

grant all privileges on public.incidents, public.metrics_daily, public.operations_heartbeats, public.rate_limits to service_role;
grant execute on function public.increment_daily_metric(date, text, integer) to service_role;
