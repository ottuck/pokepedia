-- Generated trainer names: "Brave Pikachu" instead of "Trainer-1A2B", read in the viewer's
-- language. A profile keeps an adjective id and a Pokémon id; the app formats them per locale
-- (features/profile/display-name.ts). The Pokémon doubles as the default profile picture.
--
-- Expand only: `nickname` still holds "Trainer-1A2B" for new players, so code deployed before
-- this migration keeps working. Choosing a nickname clears the adjective, and from then on the
-- chosen nickname is shown; the Pokémon stays as the picture.

-- Adjectives, mostly the games' official natures, so the three languages match the games.
-- English ones stay at 7 letters or fewer: with the longest Gen 1 name (10) a generated name
-- still fits the 20-character nickname limit, should a player copy it into the rename form.
create table public.nickname_adjective (
  id smallint primary key,
  name_ko text not null,
  name_en text not null check (char_length(name_en) <= 7),
  name_ja text not null
);

insert into public.nickname_adjective (id, name_ko, name_en, name_ja) values
  (1, '기뻐하는', 'Happy', 'よろこぶ'),
  (2, '졸린', 'Sleepy', 'ねむたい'),
  (3, '배고픈', 'Hungry', 'はらぺこの'),
  (4, '신난', 'Excited', 'ごきげんな'),
  (5, '용감한', 'Brave', 'ゆうかんな'),
  (6, '명랑한', 'Jolly', 'ようきな'),
  (7, '수줍은', 'Bashful', 'てれやの'),
  (8, '차분한', 'Calm', 'おだやかな'),
  (9, '대담한', 'Bold', 'ずぶとい'),
  (10, '얌전한', 'Gentle', 'おとなしい'),
  (11, '다정한', 'Kind', 'やさしい'),
  (12, '성실한', 'Serious', 'まじめな'),
  (13, '신중한', 'Careful', 'しんちょうな'),
  (14, '시크한', 'Cool', 'クールな'),
  (15, '천진난만한', 'Naive', 'むじゃきな'),
  (16, '장난꾸러기', 'Impish', 'わんぱくな'),
  (17, '개구쟁이', 'Naughty', 'やんちゃな'),
  (18, '성급한', 'Hasty', 'せっかちな'),
  (19, '변덕스러운', 'Quirky', 'きまぐれな'),
  (20, '고집 센', 'Adamant', 'いじっぱりな'),
  (21, '느긋한', 'Relaxed', 'のんきな'),
  (22, '온순한', 'Docile', 'すなおな'),
  (23, '노력하는', 'Hardy', 'がんばりやの'),
  (24, '겁 많은', 'Timid', 'おくびょうな'),
  (25, '똑똑한', 'Clever', 'かしこい'),
  (26, '씩씩한', 'Lively', 'げんきな'),
  (27, '반짝이는', 'Sparkly', 'きらきらの'),
  (28, '꿈꾸는', 'Dreamy', 'ゆめみる'),
  (29, '노래하는', 'Singing', 'うたう'),
  (30, '춤추는', 'Dancing', 'おどる');

alter table public.nickname_adjective enable row level security;

-- Static, public words: the owner's profile read embeds them.
grant select on public.nickname_adjective to anon, authenticated;
grant select, insert, update, delete on public.nickname_adjective to service_role;

create policy "Adjectives are public"
  on public.nickname_adjective for select to anon, authenticated
  using (true);

-- Not user-writable: the existing column grants (nickname, avatar_path) stay as they are.
alter table public.profile
  add column nickname_adjective_id smallint
    references public.nickname_adjective (id) on delete set null,
  add column avatar_pokemon_id smallint
    references public.pokemon (id) on delete set null;

-- ── New players ──────────────────────────────────────────────────────────────────────
-- Same function as before (owner, security definer, revoked from the API roles), now also
-- picking an adjective and a Pokémon. An empty catalog leaves them null: "Trainer-1A2B" shows.
create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, nickname, nickname_adjective_id, avatar_pokemon_id)
  values (
    new.id,
    'Trainer-' || upper(substr(replace(new.id::text, '-', ''), 1, 4)),
    (select a.id from public.nickname_adjective a order by random() limit 1),
    (select p.id from public.pokemon p order by random() limit 1)
  );
  return new;
end;
$$;

-- ── Renaming ─────────────────────────────────────────────────────────────────────────
-- A chosen nickname replaces the generated name. Runs as the renaming user and touches only
-- the row being updated.
create function private.clear_generated_nickname()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.nickname is distinct from old.nickname then
    new.nickname_adjective_id := null;
  end if;
  return new;
end;
$$;

revoke execute on function private.clear_generated_nickname() from public, anon, authenticated;

create trigger clear_generated_nickname_on_rename
  before update of nickname on public.profile
  for each row execute function private.clear_generated_nickname();

-- ── Existing players ─────────────────────────────────────────────────────────────────
-- Everyone gets a Pokémon picture; only untouched default names get a generated name. The
-- subqueries mention the outer row so Postgres draws again for every profile.
update public.profile p
set avatar_pokemon_id = (
      select k.id from public.pokemon k where p.id is not null order by random() limit 1
    ),
    nickname_adjective_id = case
      when p.nickname ~ '^Trainer-[0-9A-F]{4}$' then (
        select a.id from public.nickname_adjective a where p.id is not null
        order by random() limit 1
      )
    end;

-- ── Leaderboard ──────────────────────────────────────────────────────────────────────
-- `leaderboard` plus the generated name's words in the viewer's language (null for a chosen
-- nickname) and the picture's Pokémon. Still never a user id, email, Google name or uploaded
-- picture. The old function stays until the deployed code no longer calls it.
create function public.leaderboard_entries(p_locale text default 'ko', p_limit integer default 50)
returns table (
  rank bigint,
  nickname text,
  adjective text,
  pokemon_name text,
  avatar_pokemon_id smallint,
  score integer,
  best_combo smallint
)
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
  select rank() over (order by b.score desc),
         p.nickname,
         case when k.id is not null then
           case p_locale when 'en' then a.name_en when 'ja' then a.name_ja else a.name_ko end
         end,
         case when a.id is not null then
           case p_locale when 'en' then k.name_en when 'ja' then k.name_ja else k.name_ko end
         end,
         p.avatar_pokemon_id,
         b.score,
         b.best_combo
  from best b
  join public.profile p on p.id = b.user_id
  left join public.nickname_adjective a on a.id = p.nickname_adjective_id
  left join public.pokemon k on k.id = p.avatar_pokemon_id
  order by b.score desc, b.finished_at
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.leaderboard_entries(text, integer) from public;
grant execute on function public.leaderboard_entries(text, integer) to anon, authenticated, service_role;
