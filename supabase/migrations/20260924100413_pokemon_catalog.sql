-- Pokémon catalog (Gen 1, #001–151). Public read-only data, written only by the sync script
-- through public.sync_pokemon_catalog (service_role). Quiz secrets live in the unexposed
-- `private` schema so the Data API can never map a silhouette to its Pokémon.

create type public.pokemon_type as enum (
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
);

create table public.pokemon (
  id smallint primary key check (id between 1 and 151),
  name_ko text not null,
  name_en text not null,
  name_ja text not null,
  genus_ko text not null,
  genus_en text not null,
  genus_ja text not null,
  type_1 public.pokemon_type not null,
  type_2 public.pokemon_type check (type_2 is distinct from type_1),
  -- PokeAPI units (decimetres / hectograms); converted for display in the UI.
  height_dm smallint not null check (height_dm > 0),
  weight_hg smallint not null check (weight_hg > 0),
  hp smallint not null check (hp between 1 and 255),
  attack smallint not null check (attack between 1 and 255),
  defense smallint not null check (defense between 1 and 255),
  special_attack smallint not null check (special_attack between 1 and 255),
  special_defense smallint not null check (special_defense between 1 and 255),
  speed smallint not null check (speed between 1 and 255),
  description_ko text not null,
  description_en text not null,
  description_ja text not null,
  evolves_from_id smallint references public.pokemon (id),
  -- How this Pokémon evolves from evolves_from_id, e.g. {"trigger":"level-up","minLevel":16}.
  evolution jsonb check (jsonb_typeof(evolution) = 'object'),
  artwork_path text not null,
  shiny_artwork_path text not null,
  is_legendary boolean not null default false,
  is_mythical boolean not null default false,
  check (evolves_from_id is distinct from id),
  check ((evolves_from_id is null) = (evolution is null))
);

create index pokemon_evolves_from_id_idx on public.pokemon (evolves_from_id);

create table public.ability (
  id integer primary key,
  slug text not null unique,
  name_ko text not null,
  name_en text not null,
  name_ja text not null,
  description_ko text not null,
  description_en text not null,
  description_ja text not null
);

create table public.pokemon_ability (
  pokemon_id smallint not null references public.pokemon (id) on delete cascade,
  ability_id integer not null references public.ability (id),
  slot smallint not null check (slot between 1 and 3),
  is_hidden boolean not null default false,
  primary key (pokemon_id, slot)
);

create index pokemon_ability_ability_id_idx on public.pokemon_ability (ability_id);

create schema private;

create table private.pokemon_quiz (
  pokemon_id smallint primary key references public.pokemon (id) on delete cascade,
  silhouette_path text not null unique,
  -- Normalized names in every language, compared against the normalized answer.
  answer_keys text[] not null check (cardinality(answer_keys) > 0)
);

-- ── Access ───────────────────────────────────────────────────────────────────────────
-- The publishable key is public, so anything granted to anon/authenticated is reachable
-- straight from a browser. Grant exactly SELECT; RLS is a second layer, and TRUNCATE is
-- not covered by RLS at all.

alter table public.pokemon enable row level security;
alter table public.ability enable row level security;
alter table public.pokemon_ability enable row level security;
alter table private.pokemon_quiz enable row level security;

revoke all on public.pokemon, public.ability, public.pokemon_ability from anon, authenticated;
grant select on public.pokemon, public.ability, public.pokemon_ability to anon, authenticated;

create policy "Pokémon catalog is readable by everyone"
  on public.pokemon for select to anon, authenticated using (true);
create policy "Abilities are readable by everyone"
  on public.ability for select to anon, authenticated using (true);
create policy "Pokémon abilities are readable by everyone"
  on public.pokemon_ability for select to anon, authenticated using (true);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.pokemon_quiz to service_role;

-- ── Sync ─────────────────────────────────────────────────────────────────────────────
-- Replaces the whole catalog in one transaction so a failed sync never leaves the dex
-- half-updated. Each argument is a JSON array whose objects match the target table's
-- columns. Idempotent: running it twice with the same payload changes nothing.

create function public.sync_pokemon_catalog(
  p_abilities jsonb,
  p_pokemon jsonb,
  p_pokemon_abilities jsonb,
  p_quiz jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.ability
  select * from jsonb_populate_recordset(null::public.ability, p_abilities)
  on conflict (id) do update set
    slug = excluded.slug,
    name_ko = excluded.name_ko,
    name_en = excluded.name_en,
    name_ja = excluded.name_ja,
    description_ko = excluded.description_ko,
    description_en = excluded.description_en,
    description_ja = excluded.description_ja;

  -- Self-referencing evolves_from_id is fine in a single statement: FK checks run at its end.
  insert into public.pokemon
  select * from jsonb_populate_recordset(null::public.pokemon, p_pokemon)
  on conflict (id) do update set
    name_ko = excluded.name_ko,
    name_en = excluded.name_en,
    name_ja = excluded.name_ja,
    genus_ko = excluded.genus_ko,
    genus_en = excluded.genus_en,
    genus_ja = excluded.genus_ja,
    type_1 = excluded.type_1,
    type_2 = excluded.type_2,
    height_dm = excluded.height_dm,
    weight_hg = excluded.weight_hg,
    hp = excluded.hp,
    attack = excluded.attack,
    defense = excluded.defense,
    special_attack = excluded.special_attack,
    special_defense = excluded.special_defense,
    speed = excluded.speed,
    description_ko = excluded.description_ko,
    description_en = excluded.description_en,
    description_ja = excluded.description_ja,
    evolves_from_id = excluded.evolves_from_id,
    evolution = excluded.evolution,
    artwork_path = excluded.artwork_path,
    shiny_artwork_path = excluded.shiny_artwork_path,
    is_legendary = excluded.is_legendary,
    is_mythical = excluded.is_mythical;

  -- Ability slots are replaced wholesale for every Pokémon in the payload.
  delete from public.pokemon_ability
  where pokemon_id in (select (e ->> 'id')::smallint from jsonb_array_elements(p_pokemon) e);

  insert into public.pokemon_ability
  select * from jsonb_populate_recordset(null::public.pokemon_ability, p_pokemon_abilities);

  insert into private.pokemon_quiz
  select * from jsonb_populate_recordset(null::private.pokemon_quiz, p_quiz)
  on conflict (pokemon_id) do update set
    silhouette_path = excluded.silhouette_path,
    answer_keys = excluded.answer_keys;
end;
$$;

revoke execute on function public.sync_pokemon_catalog(jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_pokemon_catalog(jsonb, jsonb, jsonb, jsonb)
  to service_role;
