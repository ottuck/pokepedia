import { describe, expect, it } from "vitest";
import { matchesFilter, summarizeCollection } from "./summary";

describe("summarizeCollection", () => {
  it("counts distinct Pokémon, shiny Pokémon and every sticker", () => {
    const summary = summarizeCollection([
      { pokemon_id: 25, variant: "normal", quantity: 3 },
      { pokemon_id: 25, variant: "shiny", quantity: 1 },
      { pokemon_id: 1, variant: "normal", quantity: 1 },
      { pokemon_id: 150, variant: "shiny", quantity: 2 },
    ]);

    expect(summary.collected).toBe(3);
    expect(summary.shinyCollected).toBe(2);
    expect(summary.totalStickers).toBe(7);
    expect(summary.byPokemon.get(25)).toEqual({ normal: 3, shiny: 1 });
    expect(summary.byPokemon.get(150)).toEqual({ normal: 0, shiny: 2 });
  });

  it("is empty for a new player", () => {
    expect(summarizeCollection([])).toMatchObject({
      collected: 0,
      shinyCollected: 0,
      totalStickers: 0,
    });
  });
});

describe("matchesFilter", () => {
  const owned = { normal: 1, shiny: 0 };
  const shiny = { normal: 0, shiny: 1 };

  it.each([
    ["all", undefined, true],
    ["collected", owned, true],
    ["collected", undefined, false],
    ["missing", undefined, true],
    ["missing", owned, false],
    ["shiny", shiny, true],
    ["shiny", owned, false],
  ] as const)("%s with %j → %s", (filter, holding, expected) => {
    expect(matchesFilter(holding, filter)).toBe(expected);
  });
});
