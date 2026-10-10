-- Scope manual/test cleanup to explicit users. The existing three-argument entry point
-- and the scheduled cleanup retain their behavior and permissions.
create function public.cleanup_inactive_guests(
  p_user_ids uuid[],
  p_inactive_before timestamptz default now() - interval '60 days',
  p_dry_run boolean default false,
  p_limit integer default 1000
)
returns integer
language plpgsql
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
      and (p_user_ids is null or u.id = any(p_user_ids))
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

revoke execute on function public.cleanup_inactive_guests(uuid[], timestamptz, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.cleanup_inactive_guests(uuid[], timestamptz, boolean, integer)
  to service_role;

-- Delegate the existing API to the scoped implementation. Replacing the body preserves
-- its ACL and keeps cron and already-deployed callers compatible.
create or replace function public.cleanup_inactive_guests(
  p_inactive_before timestamptz default now() - interval '60 days',
  p_dry_run boolean default false,
  p_limit integer default 1000
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select public.cleanup_inactive_guests(null::uuid[], p_inactive_before, p_dry_run, p_limit);
$$;
