-- Minimal catalog for local development and CI (applied by `supabase start` / `db reset`).
-- Production never runs seed files; its catalog comes from `pnpm sync:pokemon`, which also
-- overwrites these rows locally. Just enough for the quiz to be playable in tests.

insert into public.pokemon (
  id, name_ko, name_en, name_ja, genus_ko, genus_en, genus_ja, type_1, type_2,
  height_dm, weight_hg, hp, attack, defense, special_attack, special_defense, speed,
  description_ko, description_en, description_ja, evolves_from_id, evolution,
  artwork_path, shiny_artwork_path, is_legendary, is_mythical
) values
  (1, '이상해씨', 'Bulbasaur', 'フシギダネ', '씨앗포켓몬', 'Seed Pokémon', 'たねポケモン',
   'grass', 'poison', 7, 69, 45, 49, 49, 65, 65, 45,
   '시드 데이터', 'Seed data', 'シードデータ', null, null,
   'normal/001.webp', 'shiny/001.webp', false, false),
  (25, '피카츄', 'Pikachu', 'ピカチュウ', '쥐포켓몬', 'Mouse Pokémon', 'ねずみポケモン',
   'electric', null, 4, 60, 35, 55, 40, 50, 50, 90,
   '시드 데이터', 'Seed data', 'シードデータ', null, null,
   'normal/025.webp', 'shiny/025.webp', false, false),
  (26, '라이츄', 'Raichu', 'ライチュウ', '쥐포켓몬', 'Mouse Pokémon', 'ねずみポケモン',
   'electric', null, 8, 300, 60, 90, 55, 90, 80, 110,
   '시드 데이터', 'Seed data', 'シードデータ', 25,
   '{"trigger": "use-item", "item": {"slug": "thunder-stone", "ko": "천둥의돌", "en": "Thunder Stone", "ja": "かみなりのいし"}}',
   'normal/026.webp', 'shiny/026.webp', false, false);

insert into private.pokemon_quiz (pokemon_id, silhouette_path, answer_keys) values
  (1, '5eed000000000001.webp', array['이상해씨', 'bulbasaur', 'フシギダネ']),
  (25, '5eed000000000025.webp', array['피카츄', 'pikachu', 'ピカチュウ']),
  (26, '5eed000000000026.webp', array['라이츄', 'raichu', 'ライチュウ']);
