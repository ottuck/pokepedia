-- Daily cleanup of abandoned guest accounts. Every quiz visitor gets an anonymous user, and
-- most never come back; they would pile up in auth.users forever.
--
-- A guest is deleted only when ALL of these hold:
--   * it is anonymous (never linked to Google);
--   * it has not been active for 60 days (see "last activity" below);
--   * it owns no sticker at all — a guest with even one sticker is kept, however old;
--   * it has no game in progress.
--
-- "Last activity" is the latest of:
--   * auth.users.created_at      — the guest was created (first quiz);
--   * auth.users.last_sign_in_at — the last sign-in;
--   * auth.sessions refreshed_at/updated_at/created_at — the session was refreshed, which
--     happens on any visit while signed in once the hour-long access token has expired
--     (the proxy refreshes it), so browsing counts, not only playing;
--   * public.quiz_run started_at/finished_at — the last game started or ended.
-- Deleting the auth user cascades to its profile, games and merge tickets.

create function public.cleanup_inactive_guests(
  p_inactive_before timestamptz default now() - interval '60 days',
  p_dry_run boolean default false,
  p_limit integer default 1000
)
returns integer
language plpgsql
-- Runs as the owner: reading and deleting auth.users is not open to any API role.
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with candidates as (
    select u.id
    from auth.users u
    where u.is_anonymous
      and greatest(
        u.created_at,
        u.last_sign_in_at,
        (
          select max(greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'UTC'))
          from auth.sessions s
          where s.user_id = u.id
        ),
        (
          select max(greatest(r.started_at, r.finished_at))
          from public.quiz_run r
          where r.user_id = u.id
        )
      ) < p_inactive_before
      and not exists (select 1 from public.user_sticker st where st.user_id = u.id)
      and not exists (
        select 1 from public.quiz_run r where r.user_id = u.id and r.status = 'active'
      )
    order by u.created_at
    limit greatest(coalesce(p_limit, 0), 0)
  ),
  deleted as (
    delete from auth.users u
    using candidates c
    where u.id = c.id and not p_dry_run
    returning u.id
  )
  select case when p_dry_run then (select count(*) from candidates)
              else (select count(*) from deleted) end
  into v_count;

  return v_count;
end;
$$;

revoke execute on function public.cleanup_inactive_guests(timestamptz, boolean, integer)
  from public, anon, authenticated;
-- service_role: for tests and a manual dry run (count only) from the server.
grant execute on function public.cleanup_inactive_guests(timestamptz, boolean, integer)
  to service_role;

-- Every day at 18:00 UTC (03:00 in Korea), the quietest hour. Scheduling by name is
-- idempotent: re-running replaces the job instead of adding a second one.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cleanup-inactive-guests',
  '0 18 * * *',
  $$select public.cleanup_inactive_guests()$$
);
