-- Applicants may create or update only their own pending application. They
-- cannot change review status, reviewer fields, or any counsellor role.
grant insert on public.counsellor_applications to authenticated;
revoke update on public.counsellor_applications from authenticated;
grant update (application, submitted_at) on public.counsellor_applications to authenticated;

create policy "applicant creates own KYC application" on public.counsellor_applications
  for insert with check (counsellor_id = auth.uid() and status = 'pending');
create policy "applicant updates own pending KYC application" on public.counsellor_applications
  for update using (counsellor_id = auth.uid() and status = 'pending')
  with check (counsellor_id = auth.uid() and status = 'pending');
