import { describe, expect, it } from "vitest";
import {
  BATTLE_ORIGIN,
  fitBattleScreen,
  initFor,
  toBattleStickers,
} from "./host";

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

describe("battle screen size", () => {
  it("is a whole-number scale of 240×216 in device pixels, capped at 720 CSS px wide", () => {
    // 100% display, roomy window: 3× = 720×648
    expect(fitBattleScreen(1100, 700, 1)).toMatchObject({ scale: 3 });
    // 150% display: 4× (960 device px) = 640 CSS px; 5× would pass the cap
    expect(fitBattleScreen(1100, 700, 1.5)).toMatchObject({ scale: 4 });
    // short window: the height decides
    expect(fitBattleScreen(1100, 500, 1)).toMatchObject({ scale: 2 });
    const { width, height, scale } = fitBattleScreen(1100, 700, 1.25);
    expect([width * 1.25 - 2, height * 1.25 - 2]).toEqual([
      scale * 240,
      scale * 216,
    ]);
  });
});
