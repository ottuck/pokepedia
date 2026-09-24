-- One profile per auth user, created automatically on sign-up (anonymous or Google).
-- Users can read and rename only themselves; nothing else about a profile is user-writable.

create table public.profile (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  created_at timestamptz not null default now()
);

alter table public.profile enable row level security;

-- Grants are explicit (auto_expose_new_tables = false). `anon` gets nothing: a visitor without
-- a session has no profile. UPDATE is limited to the nickname column.
grant select on public.profile to authenticated;
grant update (nickname) on public.profile to authenticated;
grant select, insert, update, delete on public.profile to service_role;

create policy "Users can read their own profile"
  on public.profile for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can rename themselves"
  on public.profile for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── Automatic creation ───────────────────────────────────────────────────────────────
-- Runs as the function owner (security definer) because the inserting role, supabase_auth_admin,
-- has no rights on public.profile. Lives in `private` so the Data API cannot call it.

create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- "Trainer-1A2B": language-neutral, so it reads the same in every locale.
  insert into public.profile (id, nickname)
  values (new.id, 'Trainer-' || upper(substr(replace(new.id::text, '-', ''), 1, 4)));
  return new;
end;
$$;

revoke execute on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();
