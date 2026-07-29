-- SisterCare's initial Supabase schema. Run in the Supabase SQL Editor before
-- deploying the Supabase build. Health data is private by default.
create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'counsellor', 'admin');
create type public.counsellor_status as enum ('available', 'in_session', 'offline');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text,
  photo_url text,
  role public.app_role not null default 'member',
  onboarding_completed boolean not null default false,
  preferences jsonb not null default '{"emailNotifications":true,"pushNotifications":true,"reminderDaysBefore":3,"theme":"system","language":"en"}'::jsonb,
  cycle_data jsonb,
  pregnancy_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 160),
  type text not null default 'ai_support' check (type in ('ai_support', 'counsellor')),
  status text not null default 'active' check (status in ('active', 'closed')),
  last_message text,
  message_count integer not null default 0 check (message_count >= 0),
  active_counsellor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('user', 'ai', 'counsellor')),
  content text not null check (char_length(content) between 1 and 16000),
  metadata jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

create table public.user_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_type text not null check (record_type in ('symptom', 'cycle_history', 'reminder', 'agent_event')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_records_owner_type_idx on public.user_records (user_id, record_type, created_at desc);

create table public.counsellors (
  id uuid primary key references public.profiles(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  status public.counsellor_status not null default 'offline',
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'suspended', 'expired')),
  accepting_new_sessions boolean not null default false,
  max_concurrent_sessions integer not null default 1 check (max_concurrent_sessions between 1 and 10),
  last_heartbeat timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counsellor_applications (
  id uuid primary key default gen_random_uuid(),
  counsellor_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  application jsonb not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text
);

create table public.counselling_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  counsellor_id uuid references public.counsellors(id),
  state text not null default 'requested' check (state in ('requested', 'matched', 'accepted', 'active', 'completed', 'feedback_received', 'expired', 'escalated')),
  priority text not null default 'normal' check (priority in ('normal', 'critical')),
  details jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index counselling_sessions_counsellor_state_idx on public.counselling_sessions (counsellor_id, state);

create table public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.counselling_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'counsellor')),
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index session_messages_session_created_idx on public.session_messages (session_id, created_at);

create table public.library_articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) <= 200),
  summary text not null,
  content text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger user_records_updated_at before update on public.user_records for each row execute function public.set_updated_at();
create trigger counsellors_updated_at before update on public.counsellors for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.counselling_sessions for each row execute function public.set_updated_at();
create trigger articles_updated_at before update on public.library_articles for each row execute function public.set_updated_at();

-- Profiles are created atomically when an auth user is created. Roles are
-- elevated only by a server-side administrative workflow.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_records enable row level security;
alter table public.counsellors enable row level security;
alter table public.counsellor_applications enable row level security;
alter table public.counselling_sessions enable row level security;
alter table public.session_messages enable row level security;
alter table public.library_articles enable row level security;
alter table public.audit_events enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid() or public.current_role() = 'admin');
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own conversations" on public.conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own conversation messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "own record access" on public.user_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "directory read" on public.counsellors for select using (auth.uid() is not null);
create policy "application owner or admin read" on public.counsellor_applications for select using (counsellor_id = auth.uid() or public.current_role() = 'admin');
create policy "session participant read" on public.counselling_sessions for select using (user_id = auth.uid() or counsellor_id = auth.uid() or public.current_role() = 'admin');
create policy "session message participant read" on public.session_messages for select using (exists (select 1 from public.counselling_sessions s where s.id = session_id and (s.user_id = auth.uid() or s.counsellor_id = auth.uid())));
create policy "published article read" on public.library_articles for select using (status = 'published' or author_id = auth.uid() or public.current_role() = 'admin');

-- KYC credentials remain in a private bucket. The admin server issues short
-- lived URLs after authorization; no client read policy exists for these files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('counsellor-kyc', 'counsellor-kyc', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('counsellor-profile', 'counsellor-profile', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "applicant KYC upload" on storage.objects for insert to authenticated with check (bucket_id = 'counsellor-kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "applicant profile upload" on storage.objects for insert to authenticated with check (bucket_id = 'counsellor-profile' and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.counselling_sessions, public.session_messages, public.messages;
