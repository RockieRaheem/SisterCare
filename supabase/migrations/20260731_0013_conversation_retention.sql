-- Store each conversation's retention choice at creation time so later
-- preference changes never silently rewrite or delete existing history.
alter table public.conversations
  add column if not exists retention_mode text not null default 'account';

alter table public.conversations
  drop constraint if exists conversations_retention_mode_check;

alter table public.conversations
  add constraint conversations_retention_mode_check
  check (retention_mode in ('account', 'session'));

create index if not exists conversations_owner_retention_idx
  on public.conversations (user_id, retention_mode);
