-- Professional headshots are separate from credential evidence and cannot be
-- read or uploaded directly by browser clients. Verified server routes issue
-- time-limited image URLs after checking the doctor's account.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('doctor-profile', 'doctor-profile', false, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
