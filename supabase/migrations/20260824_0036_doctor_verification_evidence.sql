alter table public.doctors
  add column if not exists credential_evidence_reference text,
  add column if not exists verification_note text;

alter table public.doctors
  add constraint doctors_evidence_required_when_verified check (
    verification_status <> 'verified'
    or (
      credential_evidence_reference is not null
      and char_length(trim(credential_evidence_reference)) between 4 and 500
    )
  ) not valid;

alter table public.doctors validate constraint doctors_evidence_required_when_verified;
