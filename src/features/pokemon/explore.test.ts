import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  DEFAULT_FILTERS,
  filterDex,
  parseDexParams,
  presentTypes,
  toDexParams,
  type DexEntry,
  type DexFilters,
} from "./explore";

const dex: DexEntry[] = [
  {
    id: 1,
    name_ko: "이상해씨",
    name_en: "Bulbasaur",
    name_ja: "フシギダネ",
    type_1: "grass",
    type_2: "poison",
  },
  {
    id: 4,
    name_ko: "파이리",
    name_en: "Charmander",
    name_ja: "ヒトカゲ",
    type_1: "fire",
    type_2: null,
  },
  {
    id: 25,
    name_ko: "피카츄",
    name_en: "Pikachu",
    name_ja: "ピカチュウ",
    type_1: "electric",
    type_2: null,
  },
  {
    id: 26,
    name_ko: "라이츄",
    name_en: "Raichu",
    name_ja: "ライチュウ",
    type_1: "electric",
    type_2: null,
  },
  {
    id: 122,
    name_ko: "마임맨",
    name_en: "Mr. Mime",
    name_ja: "バリヤード",
    type_1: "psychic",
    type_2: "fairy",
  },
];
const index = buildSearchIndex(dex);

const ids = (filters: Partial<DexFilters>, locale: "ko" | "en" | "ja" = "ko") =>
  filterDex(dex, { ...DEFAULT_FILTERS, ...filters }, locale, index).map(
    (e) => e.id,
  );

describe("filterDex search", () => {
  it.each([
    ["피카", [25]],
    ["pika", [25]],
    ["PIKACHU", [25]],
    ["ぴかちゅう", [25]],
    ["츄", [25, 26]],
    ["mrmime", [122]],
    ["Mr Mime", [122]],
    ["25", [25]],
    ["#025", [25]],
    ["2", [25, 26]],
    ["없는포켓몬", []],
    ["   ", [1, 4, 25, 26, 122]],
  ])("%s → %j", (query, expected) => {
    expect(ids({ query })).toEqual(expected);
  });

  it("finds a Pokémon by a name in another language than the UI", () => {
    expect(ids({ query: "Charmander" }, "ja")).toEqual([4]);
  });
});

describe("filterDex type and sort", () => {
  it("matches either type slot", () => {
    expect(ids({ type: "poison" })).toEqual([1]);
    expect(ids({ type: "fairy" })).toEqual([122]);
  });

  it("combines type and search", () => {
    expect(ids({ type: "electric", query: "라이" })).toEqual([26]);
  });

  it("sorts by the name in the current locale", () => {
    expect(ids({ sort: "name" }, "ko")).toEqual([26, 122, 1, 4, 25]); // 라, 마, 이, 파, 피
    expect(ids({ sort: "name" }, "en")).toEqual([1, 4, 122, 25, 26]);
  });
});

describe("URL params", () => {
  it("round-trips filters and omits defaults", () => {
    const filters: DexFilters = {
      query: "피카",
      type: "electric",
      sort: "name",
    };
    expect(parseDexParams(toDexParams(filters))).toEqual(filters);
    expect(toDexParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("falls back to defaults for invalid values", () => {
    const params = new URLSearchParams(
      "type=shadow&sort=random&q=" + "x".repeat(100),
    );
    expect(parseDexParams(params)).toEqual(DEFAULT_FILTERS);
  });
});

describe("presentTypes", () => {
  it("lists only types in use, in canonical order", () => {
    expect(presentTypes(dex)).toEqual([
      "fire",
      "grass",
      "electric",
      "poison",
      "psychic",
      "fairy",
    ]);
  });
});
