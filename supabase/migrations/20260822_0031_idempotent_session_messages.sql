-- Offline retries must never duplicate a private care message.
alter table public.session_messages
  add column if not exists client_message_id uuid;

create unique index if not exists session_messages_client_id_idx
  on public.session_messages (session_id, sender_id, client_message_id)
  where client_message_id is not null;
