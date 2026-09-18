-- Doctor access is a distinct privileged role. This migration is intentionally
-- separate because PostgreSQL enum values must be committed before later
-- migrations use them in policies or data changes.
alter type public.app_role add value if not exists 'doctor';
