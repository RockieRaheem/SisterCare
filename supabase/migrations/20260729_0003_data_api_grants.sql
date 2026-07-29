-- The project intentionally disables Supabase's automatic public-table
-- exposure. Grant the Data API only the operations required by each product
-- table; Row Level Security policies still decide which rows are accessible.
grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.user_records to authenticated;
grant select on public.counsellors to authenticated;
grant select on public.counsellor_applications to authenticated;
grant select on public.counselling_sessions to authenticated;
grant select, insert on public.session_messages to authenticated;
grant select on public.library_articles to authenticated;

-- Sequence usage is required by PostgREST for generated values if a future
-- table adds an identity column. It does not bypass any row-level policy.
grant usage on all sequences in schema public to authenticated;
