import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/pokeapi.json";
import {
  evolutionChainSchema,
  itemSchema,
  pokemonSchema,
  speciesSchema,
} from "./pokeapi";
import {
  pickLocalized,
  silhouettePath,
  toAnswerKeys,
  toPokemonRow,
} from "./transform";

// Trimmed real PokeAPI responses; parsing them also checks the response schemas.
const pikachuSpecies = speciesSchema.parse(fixtures.species25);
const mrMimeSpecies = speciesSchema.parse(fixtures.species122);
const pikachu = pokemonSchema.parse(fixtures.pokemon25);
const chain = evolutionChainSchema.parse(fixtures.chain10);
const thunderStone = itemSchema.parse(fixtures.itemThunderStone);

const idBySpeciesName = new Map([
  ["pikachu", 25],
  ["raichu", 26],
]);
const itemsBySlug = new Map([["thunder-stone", thunderStone]]);

describe("toPokemonRow", () => {
  const row = toPokemonRow({
    species: pikachuSpecies,
    pokemon: pikachu,
    chain,
    idBySpeciesName,
    itemsBySlug,
  });

  it("maps names, types, sizes and stats", () => {
    expect(row).toMatchObject({
      id: 25,
      name_ko: "피카츄",
      name_en: "Pikachu",
      name_ja: "ピカチュウ",
      genus_ko: "쥐포켓몬",
      type_1: "electric",
      type_2: null,
      height_dm: 4,
      weight_hg: 60,
      hp: 35,
      special_attack: 50,
      speed: 90,
      artwork_path: "normal/025.webp",
      shiny_artwork_path: "shiny/025.webp",
      is_legendary: false,
    });
  });

  it("drops a pre-evolution from a later generation (Pichu)", () => {
    expect(row.evolves_from_id).toBeNull();
    expect(row.evolution).toBeNull();
  });
});

describe("toAnswerKeys", () => {
  it("normalizes every supported spelling and removes duplicates", () => {
    // ja and ja-hrkt are both バリヤード; French "M. Mime" is not a supported language.
    expect(toAnswerKeys(mrMimeSpecies).sort()).toEqual(
      ["mrmime", "バリヤード", "마임맨"].sort(),
    );
  });
});

describe("pickLocalized", () => {
  const entries = [
    { language: { name: "ja-hrkt" }, value: "kana" },
    { language: { name: "ja" }, value: "old" },
    { language: { name: "ja" }, value: "new" },
  ];

  it("throws instead of silently using another language", () => {
    expect(() => pickLocalized(entries, "ko", "test")).toThrow(
      "test: no ko entry",
    );
  });
});

describe("silhouettePath", () => {
  it("is stable for the same secret and unrelated to the dex number", () => {
    const secret = "a".repeat(32);
    expect(silhouettePath(25, secret)).toBe(silhouettePath(25, secret));
    expect(silhouettePath(25, secret)).toMatch(/^[0-9a-f]{16}\.webp$/);
    expect(silhouettePath(25, secret)).not.toBe(
      silhouettePath(25, "b".repeat(32)),
    );
  });
});
