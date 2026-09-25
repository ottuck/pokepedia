import { createHmac } from "node:crypto";
import { normalizeAnswer } from "../../src/features/quiz/normalize";
import {
  Constants,
  type Database,
} from "../../src/lib/supabase/database.types";
import type {
  Ability,
  ChainLink,
  EvolutionChain,
  Item,
  Pokemon,
  Species,
} from "./pokeapi";
import { apiPath } from "./pokeapi";

type Tables = Database["public"]["Tables"];
type PokemonRow = Tables["pokemon"]["Row"];
type AbilityRow = Tables["ability"]["Row"];
type PokemonAbilityRow = Tables["pokemon_ability"]["Row"];
type PokemonType = Database["public"]["Enums"]["pokemon_type"];
type QuizRow = {
  pokemon_id: number;
  silhouette_path: string;
  answer_keys: string[];
};

export const FIRST_ID = 1;
export const LAST_ID = 151;

type AppLocale = "ko" | "en" | "ja";

// PokeAPI language codes to try, in order. "ja" mixes kanji; "ja-hrkt" is kana only.
const LANGUAGE_CODES: Record<AppLocale, readonly string[]> = {
  ko: ["ko"],
  en: ["en"],
  ja: ["ja", "ja-hrkt"],
};

// PokeAPI text wraps lines like the game's text box. Japanese separates phrases with
// ideographic spaces, so a line break there becomes one too.
const LINE_BREAK_REPLACEMENT: Record<AppLocale, string> = {
  ko: " ",
  en: " ",
  ja: "　",
};

const SOFT_HYPHEN = String.fromCodePoint(0xad);

type Localized = { language: { name: string } };

/**
 * The entry for `locale`, preferring earlier language codes and, within one code, the last
 * entry (PokeAPI lists game versions oldest first). Throws when the locale is missing,
 * because every column is NOT NULL and a silent fallback would ship the wrong language.
 */
export function pickLocalized<T extends Localized>(
  entries: readonly T[],
  locale: AppLocale,
  context: string,
): T {
  for (const code of LANGUAGE_CODES[locale]) {
    const match = entries.findLast((entry) => entry.language.name === code);
    if (match) return match;
  }
  throw new Error(`${context}: no ${locale} entry`);
}

function cleanFlavorText(text: string, locale: AppLocale): string {
  return text
    .replaceAll(SOFT_HYPHEN, "")
    .replace(/[\f\r\n]+/g, LINE_BREAK_REPLACEMENT[locale])
    .replace(/ {2,}/g, " ")
    .trim();
}

function localizedColumns<T extends Localized>(
  entries: readonly T[],
  read: (entry: T, locale: AppLocale) => string,
  context: string,
) {
  const value = (locale: AppLocale) =>
    read(pickLocalized(entries, locale, context), locale);
  return { ko: value("ko"), en: value("en"), ja: value("ja") };
}

function idFromUrl(url: string): number {
  const id = Number(apiPath(url).split("/").pop());
  if (!Number.isInteger(id)) throw new Error(`No numeric id in ${url}`);
  return id;
}

function toPokemonType(name: string): PokemonType {
  const match = Constants.public.Enums.pokemon_type.find(
    (type) => type === name,
  );
  if (!match) throw new Error(`Unknown Pokémon type: ${name}`);
  return match;
}

const pad = (id: number) => String(id).padStart(3, "0");
export const artworkPath = (id: number) => `normal/${pad(id)}.webp`;
export const shinyArtworkPath = (id: number) => `shiny/${pad(id)}.webp`;

/** Stable but unguessable silhouette file name: without the secret you cannot map it to an id. */
export function silhouettePath(id: number, secret: string): string {
  const digest = createHmac("sha256", secret).update(String(id)).digest("hex");
  return `${digest.slice(0, 16)}.webp`;
}

// ── Evolution ──

type Evolution = {
  trigger: string;
  minLevel?: number;
  item?: { slug: string; ko: string; en: string; ja: string };
};

type EvolutionSource = {
  fromSpeciesName: string;
  detail: ChainLink["evolution_details"][number];
};

/** Where `speciesName` evolves from within the chain, or null for a chain root. */
export function findEvolutionSource(
  chain: EvolutionChain,
  speciesName: string,
): EvolutionSource | null {
  const visit = (link: ChainLink): EvolutionSource | null | undefined => {
    for (const child of link.evolves_to) {
      if (child.species.name === speciesName) {
        const detail =
          child.evolution_details.find((d) => d.is_default) ??
          child.evolution_details[0];
        if (!detail)
          throw new Error(`${speciesName}: evolution has no details`);
        return { fromSpeciesName: link.species.name, detail };
      }
      const found = visit(child);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  if (chain.chain.species.name === speciesName) return null;
  const found = visit(chain.chain);
  if (found === undefined)
    throw new Error(`${speciesName} not found in chain ${chain.id}`);
  return found;
}

function itemNames(item: Item): NonNullable<Evolution["item"]> {
  const names = localizedColumns(
    item.names,
    (entry) => entry.name,
    `item ${item.name}`,
  );
  return { slug: item.name, ...names };
}

// ── Rows ──

const STAT_COLUMNS = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "special_attack",
  "special-defense": "special_defense",
  speed: "speed",
} as const;

type PokemonSource = {
  species: Species;
  pokemon: Pokemon;
  chain: EvolutionChain;
  /** Species name → national dex id, for every Pokémon in range. */
  idBySpeciesName: ReadonlyMap<string, number>;
  itemsBySlug: ReadonlyMap<string, Item>;
};

export function toPokemonRow({
  species,
  pokemon,
  chain,
  idBySpeciesName,
  itemsBySlug,
}: PokemonSource): PokemonRow {
  const context = `#${species.id} ${species.name}`;
  const names = localizedColumns(
    species.names,
    (e) => e.name,
    `${context} names`,
  );
  const genera = localizedColumns(
    species.genera,
    (e) => e.genus,
    `${context} genera`,
  );
  const descriptions = localizedColumns(
    species.flavor_text_entries,
    (e, locale) => cleanFlavorText(e.flavor_text, locale),
    `${context} flavor text`,
  );

  const [type1, type2] = [...pokemon.types].sort((a, b) => a.slot - b.slot);

  const stats = Object.fromEntries(
    pokemon.stats.map((s) => {
      const column = STAT_COLUMNS[s.stat.name as keyof typeof STAT_COLUMNS];
      if (!column) throw new Error(`${context}: unknown stat ${s.stat.name}`);
      return [column, s.base_stat];
    }),
  ) as Record<(typeof STAT_COLUMNS)[keyof typeof STAT_COLUMNS], number>;
  for (const column of Object.values(STAT_COLUMNS)) {
    if (stats[column] === undefined)
      throw new Error(`${context}: missing stat ${column}`);
  }

  // Pre-evolutions from later generations (Pichu, Cleffa, …) are cut: in this dex,
  // Pikachu has no pre-evolution.
  const source = findEvolutionSource(chain, species.name);
  const evolvesFromId = source
    ? (idBySpeciesName.get(source.fromSpeciesName) ?? null)
    : null;
  let evolution: Evolution | null = null;
  if (source && evolvesFromId !== null) {
    evolution = { trigger: source.detail.trigger.name };
    if (source.detail.min_level !== null)
      evolution.minLevel = source.detail.min_level;
    if (source.detail.item) {
      const item = itemsBySlug.get(source.detail.item.name);
      if (!item)
        throw new Error(
          `${context}: item ${source.detail.item.name} not fetched`,
        );
      evolution.item = itemNames(item);
    }
  }

  return {
    id: species.id,
    name_ko: names.ko,
    name_en: names.en,
    name_ja: names.ja,
    genus_ko: genera.ko,
    genus_en: genera.en,
    genus_ja: genera.ja,
    type_1: toPokemonType(type1.type.name),
    type_2: type2 ? toPokemonType(type2.type.name) : null,
    height_dm: pokemon.height,
    weight_hg: pokemon.weight,
    ...stats,
    description_ko: descriptions.ko,
    description_en: descriptions.en,
    description_ja: descriptions.ja,
    evolves_from_id: evolvesFromId,
    evolution,
    artwork_path: artworkPath(species.id),
    shiny_artwork_path: shinyArtworkPath(species.id),
    is_legendary: species.is_legendary,
    is_mythical: species.is_mythical,
  };
}

export function toAbilityRow(ability: Ability): AbilityRow {
  const context = `ability ${ability.name}`;
  const names = localizedColumns(
    ability.names,
    (e) => e.name,
    `${context} names`,
  );
  const descriptions = localizedColumns(
    ability.flavor_text_entries,
    (e, locale) => cleanFlavorText(e.flavor_text, locale),
    `${context} flavor text`,
  );
  return {
    id: ability.id,
    slug: ability.name,
    name_ko: names.ko,
    name_en: names.en,
    name_ja: names.ja,
    description_ko: descriptions.ko,
    description_en: descriptions.en,
    description_ja: descriptions.ja,
  };
}

export function toPokemonAbilityRows(pokemon: Pokemon): PokemonAbilityRow[] {
  return pokemon.abilities.map((entry) => ({
    pokemon_id: pokemon.id,
    ability_id: idFromUrl(entry.ability.url),
    slot: entry.slot,
    is_hidden: entry.is_hidden,
  }));
}

/** Every accepted spelling of the name, normalized and de-duplicated. */
export function toAnswerKeys(species: Species): string[] {
  const names = species.names
    .filter((entry) =>
      Object.values(LANGUAGE_CODES).flat().includes(entry.language.name),
    )
    .map((entry) => normalizeAnswer(entry.name))
    .filter((key) => key.length > 0);
  if (names.length === 0) throw new Error(`#${species.id}: no answer keys`);
  return [...new Set(names)];
}

export function toQuizRow(species: Species, secret: string): QuizRow {
  return {
    pokemon_id: species.id,
    silhouette_path: silhouettePath(species.id, secret),
    answer_keys: toAnswerKeys(species),
  };
}
