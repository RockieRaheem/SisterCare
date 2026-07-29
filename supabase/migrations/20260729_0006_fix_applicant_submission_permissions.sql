-- Keep KYC ownership and review decisions immutable while allowing each
-- authenticated applicant to create or revise their own pending submission.
alter table public.counsellor_applications enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.counsellor_applications to authenticated;
revoke update on public.counsellor_applications from authenticated;
grant update (application, submitted_at) on public.counsellor_applications to authenticated;

drop policy if exists "applicant creates own KYC application" on public.counsellor_applications;
create policy "applicant creates own KYC application"
  on public.counsellor_applications
  for insert
  to authenticated
  with check (
    counsellor_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and review_note is null
  );

drop policy if exists "applicant updates own pending KYC application" on public.counsellor_applications;
create policy "applicant updates own pending KYC application"
  on public.counsellor_applications
  for update
  to authenticated
  using (counsellor_id = auth.uid() and status = 'pending')
  with check (
    counsellor_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and review_note is null
  );
