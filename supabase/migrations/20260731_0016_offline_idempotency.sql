-- Append-only offline writes use a client-generated UUID so retries after
-- reconnect cannot create duplicate private records.
alter table public.user_records
  add column if not exists idempotency_key uuid;

create unique index if not exists user_records_owner_idempotency_idx
  on public.user_records (user_id, idempotency_key)
  where idempotency_key is not null;
