-- Leaderboard: each player's best single game, ranked by score. Guests are included.
-- quiz_run and profile stay readable only by their owner (RLS unchanged); these two
-- security definer functions are the only public window onto them, and they return nothing
-- but nickname, score and best combo — never a user id, email or Google name.

-- The best finished game per player: supports the "distinct on (user_id) … score desc" scan.
create index quiz_run_best_score_idx
  on public.quiz_run (user_id, score desc, finished_at)
  where status = 'finished';

-- Top players, best game each. Ties share a rank; the earlier game is listed first.
create function public.leaderboard(p_limit integer default 50)
returns table (rank bigint, nickname text, score integer, best_combo smallint)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.best_combo, r.finished_at
    from public.quiz_run r
    where r.status = 'finished' and r.score > 0
    order by r.user_id, r.score desc, r.finished_at
  )
  select rank() over (order by b.score desc), p.nickname, b.score, b.best_combo
  from best b
  join public.profile p on p.id = b.user_id
  order by b.score desc, b.finished_at
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- The signed-in player's own standing (no row before their first scored game).
create function public.my_leaderboard_rank()
returns table (rank bigint, score integer, best_combo smallint)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.best_combo
    from public.quiz_run r
    where r.status = 'finished' and r.score > 0
    order by r.user_id, r.score desc, r.finished_at
  )
  select 1 + (select count(*) from best other where other.score > mine.score),
         mine.score,
         mine.best_combo
  from best mine
  where mine.user_id = (select auth.uid());
$$;

revoke execute on function public.leaderboard(integer) from public;
revoke execute on function public.my_leaderboard_rank() from public, anon;
grant execute on function public.leaderboard(integer) to anon, authenticated, service_role;
grant execute on function public.my_leaderboard_rank() to authenticated, service_role;
