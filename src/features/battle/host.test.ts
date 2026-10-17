import { describe, expect, it } from "vitest";
import { BATTLE_ORIGIN, initFor, toBattleStickers } from "./host";

const owned = toBattleStickers([
  { pokemon_id: 25, variant: "normal", quantity: 2 },
  { pokemon_id: 25, variant: "shiny", quantity: 1 },
]);

describe("battle host messages", () => {
  it("answers the game's ready with every owned sticker", () => {
    expect(
      initFor(
        { origin: BATTLE_ORIGIN, data: { type: "ready", v: 1 } },
        "ja",
        owned,
      ),
    ).toEqual({
      type: "init",
      v: 1,
      locale: "ja",
      owned: [
        { id: 25, shiny: false },
        { id: 25, shiny: true },
      ],
    });
  });

  it("ignores other origins and anything but a v1 ready", () => {
    const ready = { type: "ready", v: 1 };
    expect(
      initFor({ origin: "https://evil.example", data: ready }, "ko", owned),
    ).toBeNull();
    expect(
      initFor(
        { origin: BATTLE_ORIGIN, data: { type: "ready", v: 2 } },
        "ko",
        owned,
      ),
    ).toBeNull();
    expect(
      initFor({ origin: BATTLE_ORIGIN, data: "ready" }, "ko", owned),
    ).toBeNull();
    expect(
      initFor({ origin: BATTLE_ORIGIN, data: null }, "ko", owned),
    ).toBeNull();
  });
});
