import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/pokeapi.json";
import {
  abilitySchema,
  evolutionChainSchema,
  itemSchema,
  pokemonSchema,
  speciesSchema,
} from "./pokeapi";
import {
  cleanFlavorText,
  pickLocalized,
  silhouettePath,
  toAbilityRow,
  toAnswerKeys,
  toPokemonAbilityRows,
  toPokemonRow,
} from "./transform";

// Trimmed real PokeAPI responses; parsing them also checks the response schemas.
const pikachuSpecies = speciesSchema.parse(fixtures.species25);
const raichuSpecies = speciesSchema.parse(fixtures.species26);
const mrMimeSpecies = speciesSchema.parse(fixtures.species122);
const pikachu = pokemonSchema.parse(fixtures.pokemon25);
const raichu = pokemonSchema.parse(fixtures.pokemon26);
const chain = evolutionChainSchema.parse(fixtures.chain10);
const thunderStone = itemSchema.parse(fixtures.itemThunderStone);
const staticAbility = abilitySchema.parse(fixtures.ability9);

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

  it("describes an item evolution with localized item names", () => {
    const raichuRow = toPokemonRow({
      species: raichuSpecies,
      pokemon: raichu,
      chain,
      idBySpeciesName,
      itemsBySlug,
    });
    expect(raichuRow.evolves_from_id).toBe(25);
    expect(raichuRow.evolution).toEqual({
      trigger: "use-item",
      item: {
        slug: "thunder-stone",
        ko: "천둥의돌",
        en: "Thunder Stone",
        ja: "かみなりのいし",
      },
    });
  });

  it("uses the latest flavor text per language, without game line breaks", () => {
    for (const text of [
      row.description_ko,
      row.description_en,
      row.description_ja,
    ]) {
      expect(text).not.toMatch(/[\n\f]/);
      expect(text.length).toBeGreaterThan(10);
    }
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

describe("toAbilityRow / toPokemonAbilityRows", () => {
  it("maps an ability with localized names and descriptions", () => {
    expect(toAbilityRow(staticAbility)).toMatchObject({
      id: 9,
      slug: "static",
      name_ko: "정전기",
      name_en: "Static",
      name_ja: "せいでんき",
    });
  });

  it("keeps slots and hidden abilities", () => {
    expect(toPokemonAbilityRows(pikachu)).toEqual([
      { pokemon_id: 25, ability_id: 9, slot: 1, is_hidden: false },
      { pokemon_id: 25, ability_id: 31, slot: 3, is_hidden: true },
    ]);
  });
});

describe("pickLocalized", () => {
  const entries = [
    { language: { name: "ja-hrkt" }, value: "kana" },
    { language: { name: "ja" }, value: "old" },
    { language: { name: "ja" }, value: "new" },
  ];

  it("prefers the first language code and its latest entry", () => {
    expect(pickLocalized(entries, "ja", "test").value).toBe("new");
  });

  it("falls back to the next language code", () => {
    expect(pickLocalized(entries.slice(0, 1), "ja", "test").value).toBe("kana");
  });

  it("throws instead of silently using another language", () => {
    expect(() => pickLocalized(entries, "ko", "test")).toThrow(
      "test: no ko entry",
    );
  });
});

describe("cleanFlavorText", () => {
  it("joins wrapped lines with a space, or an ideographic space in Japanese", () => {
    expect(cleanFlavorText("A clever\nforest-dweller\froasts", "en")).toBe(
      "A clever forest-dweller roasts",
    );
    expect(cleanFlavorText("電気を\n流す", "ja")).toBe("電気を　流す");
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
