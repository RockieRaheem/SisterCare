alter table public.library_articles
  add column if not exists tags text[] not null default '{}',
  add column if not exists cover_image_url text;

create or replace function public.consume_rate_limit(
  rate_key text,
  request_limit integer,
  window_ms bigint,
  request_time timestamptz
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.rate_limits%rowtype;
  elapsed_ms bigint;
begin
  if request_limit < 1 or window_ms < 1000 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  insert into public.rate_limits (key, count, window_started_at, updated_at)
  values (rate_key, 0, request_time, request_time)
  on conflict (key) do nothing;

  select * into current_row
  from public.rate_limits
  where key = rate_key
  for update;

  elapsed_ms := floor(extract(epoch from (request_time - current_row.window_started_at)) * 1000);
  if elapsed_ms < 0 or elapsed_ms >= window_ms then
    update public.rate_limits
    set count = 1, window_started_at = request_time, updated_at = request_time
    where key = rate_key;
    return query select true, 0;
  elsif current_row.count >= request_limit then
    return query select false, greatest(1, ceil((window_ms - elapsed_ms) / 1000.0)::integer);
  else
    update public.rate_limits
    set count = count + 1, updated_at = request_time
    where key = rate_key;
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, bigint, timestamptz) to service_role;
