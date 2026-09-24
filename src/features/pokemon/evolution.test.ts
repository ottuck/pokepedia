import { describe, expect, it } from "vitest";
import { buildEvolutionStages } from "./evolution";

const levelUp = (minLevel: number) => ({ trigger: "level-up", minLevel });
const stone = (slug: string) => ({
  trigger: "use-item",
  item: { slug, ko: slug, en: slug, ja: slug },
});

const dex = [
  { id: 1, evolves_from_id: null, evolution: null },
  { id: 2, evolves_from_id: 1, evolution: levelUp(16) },
  { id: 3, evolves_from_id: 2, evolution: levelUp(32) },
  { id: 25, evolves_from_id: null, evolution: null },
  { id: 26, evolves_from_id: 25, evolution: stone("thunder-stone") },
  { id: 133, evolves_from_id: null, evolution: null },
  { id: 136, evolves_from_id: 133, evolution: stone("fire-stone") },
  { id: 134, evolves_from_id: 133, evolution: stone("water-stone") },
  { id: 135, evolves_from_id: 133, evolution: stone("thunder-stone") },
  { id: 64, evolves_from_id: 63, evolution: levelUp(16) },
  { id: 63, evolves_from_id: null, evolution: null },
  { id: 65, evolves_from_id: 64, evolution: { trigger: "trade" } },
  { id: 128, evolves_from_id: null, evolution: null },
];

const ids = (id: number) =>
  buildEvolutionStages(dex, id).map((stage) =>
    stage.map(({ member }) => member.id),
  );

describe("buildEvolutionStages", () => {
  it("returns the whole line from any member", () => {
    expect(ids(1)).toEqual([[1], [2], [3]]);
    expect(ids(3)).toEqual([[1], [2], [3]]);
  });

  it("does not depend on list order", () => {
    expect(ids(65)).toEqual([[63], [64], [65]]);
  });

  it("puts branches in one stage, ordered by dex number", () => {
    expect(ids(135)).toEqual([[133], [134, 135, 136]]);
  });

  it("returns a single stage for a Pokémon without evolutions", () => {
    expect(ids(128)).toEqual([[128]]);
  });

  it("parses how each member evolves", () => {
    const [, second, third] = buildEvolutionStages(dex, 65);
    expect(second[0].evolution).toEqual({ trigger: "level-up", minLevel: 16 });
    expect(third[0].evolution).toEqual({ trigger: "trade" });
  });

  it("rejects malformed evolution data instead of rendering nonsense", () => {
    const broken = [
      ...dex,
      { id: 150, evolves_from_id: 128, evolution: { minLevel: "x" } },
    ];
    expect(() => buildEvolutionStages(broken, 150)).toThrow();
  });
});
