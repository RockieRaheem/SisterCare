create type public.doctor_status as enum ('available', 'busy', 'offline');

create table public.doctors (
  id uuid primary key references public.profiles(id) on delete cascade,
  professional_name text not null check (char_length(professional_name) between 2 and 100),
  title text not null check (char_length(title) between 2 and 100),
  bio text not null default '' check (char_length(bio) <= 1200),
  specializations text[] not null default '{}',
  languages text[] not null default array['English'],
  registration_number text not null unique,
  licensing_body text not null,
  credential_expires_at date not null,
  profile_photo_path text,
  years_experience integer not null default 0 check (years_experience between 0 and 80),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended', 'expired')),
  status public.doctor_status not null default 'offline',
  accepting_appointments boolean not null default false,
  last_heartbeat_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_appointments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'booked', 'in_consultation', 'completed', 'declined', 'cancelled')),
  urgency text not null default 'routine'
    check (urgency in ('routine', 'urgent', 'critical')),
  specialty text not null check (char_length(specialty) between 2 and 100),
  member_summary text not null default '' check (char_length(member_summary) <= 500),
  preferred_language text not null default 'English',
  scheduled_for timestamptz,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  consultation_started_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.doctor_appointments(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  medicine_name text not null check (char_length(medicine_name) between 2 and 160),
  strength text not null check (char_length(strength) between 1 and 80),
  dose text not null check (char_length(dose) between 1 and 120),
  route text not null check (char_length(route) between 2 and 80),
  frequency text not null check (char_length(frequency) between 2 and 120),
  duration text not null check (char_length(duration) between 2 and 120),
  quantity text not null check (char_length(quantity) between 1 and 80),
  instructions text not null default '' check (char_length(instructions) <= 1000),
  clinical_attestation boolean not null check (clinical_attestation),
  status text not null default 'issued' check (status in ('issued', 'voided')),
  issued_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text check (char_length(void_reason) <= 500),
  created_at timestamptz not null default now(),
  unique (appointment_id, medicine_name, issued_at)
);

create index doctors_directory_idx
  on public.doctors (verification_status, status, accepting_appointments);
create index doctor_appointments_member_idx
  on public.doctor_appointments (member_id, requested_at desc);
create index doctor_appointments_doctor_idx
  on public.doctor_appointments (doctor_id, status, requested_at desc);
create index doctor_prescriptions_member_idx
  on public.doctor_prescriptions (member_id, issued_at desc);

create trigger doctors_updated_at
before update on public.doctors
for each row execute function public.set_updated_at();

create trigger doctor_appointments_updated_at
before update on public.doctor_appointments
for each row execute function public.set_updated_at();

alter table public.doctors enable row level security;
alter table public.doctor_appointments enable row level security;
alter table public.doctor_prescriptions enable row level security;

-- All access is mediated by authenticated server routes so directory output
-- can omit licence identifiers and private consultation information.
revoke all on public.doctors from anon, authenticated;
revoke all on public.doctor_appointments from anon, authenticated;
revoke all on public.doctor_prescriptions from anon, authenticated;
grant all privileges on public.doctors to service_role;
grant all privileges on public.doctor_appointments to service_role;
grant all privileges on public.doctor_prescriptions to service_role;
