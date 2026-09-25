-- Profile pictures for Google users. The bucket itself (public, 512 KiB, webp or jpeg) is
-- declared in supabase/config.toml; this migration decides who may write to it and where
-- the profile points.
--
-- Files live at avatars/{user_id}/{timestamp}.webp, or .jpg where the browser cannot encode
-- webp. A new upload gets a new name instead of overwriting, so browsers and the CDN never
-- show a stale picture.

-- The chosen picture. The check keeps it inside the owner's own folder, so nobody can point
-- their profile at someone else's file.
alter table public.profile
  add column avatar_path text
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9]{10,16}\.(webp|jpg)$'));

-- Owners may set it themselves (RLS "Users can rename themselves" already limits updates to
-- their own row); the server action also refuses guests.
grant update (avatar_path) on public.profile to authenticated;

-- Storage: only signed-in, non-guest users, and only inside their own folder. Reading needs
-- no policy (public bucket, served by URL); the select policy lets owners find and remove
-- their earlier files.
create policy "Google users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Users see their own avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
