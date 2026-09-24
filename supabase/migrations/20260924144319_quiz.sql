-- Silhouette quiz: runs (score/combo across questions), rounds (one question, 3 HP) and the
-- sticker collection. Game rules live in TypeScript (src/features/quiz/rules.ts); the database
-- stores trusted state and applies each transition atomically through service_role-only RPCs.

create type public.quiz_run_status as enum ('active', 'finished');
create type public.quiz_run_end_reason as enum ('fainted', 'fled');
create type public.quiz_round_status as enum ('active', 'cleared', 'failed', 'skipped');
create type public.sticker_variant as enum ('normal', 'shiny');

create table public.quiz_run (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.quiz_run_status not null default 'active',
  end_reason public.quiz_run_end_reason,
  score integer not null default 0 check (score >= 0),
  combo smallint not null default 0 check (combo >= 0),
  best_combo smallint not null default 0 check (best_combo >= combo),
  rounds_cleared smallint not null default 0 check (rounds_cleared >= 0),
  skips_left smallint not null check (skips_left >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check ((status = 'finished') = (finished_at is not null)),
  check ((status = 'finished') = (end_reason is not null))
);

-- A player has at most one run in progress; reloading the page resumes it.
create unique index quiz_run_one_active_per_user on public.quiz_run (user_id) where status = 'active';
create index quiz_run_user_id_idx on public.quiz_run (user_id);

create table public.quiz_round (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quiz_run (id) on delete cascade,
  -- Denormalized from the run so RLS can check ownership without a join.
  user_id uuid not null references auth.users (id) on delete cascade,
  seq smallint not null check (seq >= 1),
  pokemon_id smallint not null references public.pokemon (id),
  status public.quiz_round_status not null default 'active',
  hp smallint not null check (hp between 0 and 3),
  attempts smallint not null default 0 check (attempts >= 0),
  hint_used boolean not null default false,
  score_gained integer check (score_gained >= 0),
  sticker_variant public.sticker_variant,
  -- Optimistic lock: every transition names the version it read, so a double-submitted
  -- answer can never be applied twice.
  version integer not null default 0,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (run_id, seq),
  check ((status = 'active') = (resolved_at is null)),
  check (sticker_variant is null or status = 'cleared')
);

create unique index quiz_round_one_active_per_run on public.quiz_round (run_id) where status = 'active';
create index quiz_round_user_id_idx on public.quiz_round (user_id);
create index quiz_round_pokemon_id_idx on public.quiz_round (pokemon_id);

create table public.user_sticker (
  user_id uuid not null references auth.users (id) on delete cascade,
  pokemon_id smallint not null references public.pokemon (id),
  variant public.sticker_variant not null,
  quantity integer not null check (quantity > 0),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at timestamptz not null default now(),
  primary key (user_id, pokemon_id, variant)
);

create index user_sticker_pokemon_id_idx on public.user_sticker (pokemon_id);

-- ── Access ───────────────────────────────────────────────────────────────────────────
-- Players only ever read their own rows. A round still in play is hidden entirely: its
-- pokemon_id is the answer. All writes go through the RPCs below (service_role only).

alter table public.quiz_run enable row level security;
alter table public.quiz_round enable row level security;
alter table public.user_sticker enable row level security;

grant select on public.quiz_run, public.quiz_round, public.user_sticker to authenticated;
grant select, insert, update, delete
  on public.quiz_run, public.quiz_round, public.user_sticker
  to service_role;

create policy "Players read their own runs"
  on public.quiz_run for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players read their own finished rounds"
  on public.quiz_round for select to authenticated
  using ((select auth.uid()) = user_id and status <> 'active');

create policy "Players read their own stickers"
  on public.user_sticker for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── RPCs (service_role only) ─────────────────────────────────────────────────────────

-- The answer keys and silhouette of a round in play, for the server to grade and render.
create function public.quiz_round_secret(p_user_id uuid, p_round_id uuid)
returns table (pokemon_id smallint, answer_keys text[], silhouette_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.pokemon_id, q.answer_keys, q.silhouette_path
  from public.quiz_round r
  join private.pokemon_quiz q on q.pokemon_id = r.pokemon_id
  where r.id = p_round_id and r.user_id = p_user_id;
$$;

-- Starts a run with its first round. Fails with unique_violation if the player already has an
-- active run (the server resumes that one instead).
create function public.quiz_start_run(
  p_user_id uuid,
  p_pokemon_id smallint,
  p_hp smallint,
  p_skips smallint
)
returns table (run_id uuid, round_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_round_id uuid;
begin
  insert into public.quiz_run (user_id, skips_left)
  values (p_user_id, p_skips)
  returning id into v_run_id;

  insert into public.quiz_round (run_id, user_id, seq, pokemon_id, hp)
  values (v_run_id, p_user_id, 1, p_pokemon_id, p_hp)
  returning id into v_round_id;

  return query select v_run_id, v_round_id;
end;
$$;

-- Applies one computed transition in a single transaction:
--   round state (guarded by version) → run state → sticker (+1) → optional next round.
-- p_round / p_run carry the new column values as computed by rules.ts.
-- Raises 'quiz_conflict' when the round is not active or was changed since it was read.
create function public.quiz_commit(
  p_user_id uuid,
  p_round_id uuid,
  p_expected_version integer,
  p_round jsonb,
  p_run jsonb,
  p_sticker_variant public.sticker_variant default null,
  p_next_pokemon_id smallint default null,
  p_next_hp smallint default null
)
returns table (sticker_quantity integer, next_round_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_round public.quiz_round;
  v_new public.quiz_round := jsonb_populate_record(null::public.quiz_round, p_round);
  v_run public.quiz_run := jsonb_populate_record(null::public.quiz_run, p_run);
  v_quantity integer;
  v_next_id uuid;
begin
  update public.quiz_round r
  set status = v_new.status,
      hp = v_new.hp,
      attempts = v_new.attempts,
      hint_used = v_new.hint_used,
      score_gained = v_new.score_gained,
      sticker_variant = p_sticker_variant,
      resolved_at = case when v_new.status = 'active' then null else now() end,
      version = r.version + 1
  where r.id = p_round_id
    and r.user_id = p_user_id
    and r.status = 'active'
    and r.version = p_expected_version
  returning * into v_round;

  if not found then
    raise exception 'quiz_conflict' using errcode = 'P0001';
  end if;

  update public.quiz_run
  set status = v_run.status,
      end_reason = v_run.end_reason,
      score = v_run.score,
      combo = v_run.combo,
      best_combo = v_run.best_combo,
      rounds_cleared = v_run.rounds_cleared,
      skips_left = v_run.skips_left,
      finished_at = case when v_run.status = 'finished' then now() else null end
  where id = v_round.run_id and user_id = p_user_id and status = 'active';

  if not found then
    raise exception 'quiz_conflict' using errcode = 'P0001';
  end if;

  if p_sticker_variant is not null then
    insert into public.user_sticker as s (user_id, pokemon_id, variant, quantity)
    values (p_user_id, v_round.pokemon_id, p_sticker_variant, 1)
    on conflict (user_id, pokemon_id, variant) do update
      set quantity = s.quantity + 1, last_obtained_at = now()
    returning s.quantity into v_quantity;
  end if;

  if p_next_pokemon_id is not null then
    insert into public.quiz_round (run_id, user_id, seq, pokemon_id, hp)
    values (v_round.run_id, p_user_id, v_round.seq + 1, p_next_pokemon_id, p_next_hp)
    returning id into v_next_id;
  end if;

  return query select v_quantity, v_next_id;
end;
$$;

revoke execute on function public.quiz_round_secret(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.quiz_start_run(uuid, smallint, smallint, smallint)
  from public, anon, authenticated;
revoke execute on function public.quiz_commit(
  uuid, uuid, integer, jsonb, jsonb, public.sticker_variant, smallint, smallint
) from public, anon, authenticated;

grant execute on function public.quiz_round_secret(uuid, uuid) to service_role;
grant execute on function public.quiz_start_run(uuid, smallint, smallint, smallint) to service_role;
grant execute on function public.quiz_commit(
  uuid, uuid, integer, jsonb, jsonb, public.sticker_variant, smallint, smallint
) to service_role;
