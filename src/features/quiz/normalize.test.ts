import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "./normalize";

describe("normalizeAnswer", () => {
  it.each([
    ["Pikachu", "pikachu"],
    ["  PIKACHU  ", "pikachu"],
    ["Ｐｉｋａｃｈｕ", "pikachu"],
    ["Mr. Mime", "mrmime"],
    ["Farfetch’d", "farfetchd"],
    ["Farfetch'd", "farfetchd"],
    ["Nidoran♀", "nidoran"],
    ["니드런♂", "니드런"],
    ["피 카 츄", "피카츄"],
    ["ピカチュウ", "ピカチュウ"],
    ["ぴかちゅう", "ピカチュウ"],
    ["ﾋﾟｶﾁｭｳ", "ピカチュウ"],
    ["ポリゴン２", "ポリゴン2"],
    ["バリヤード", "バリヤード"],
    ["プリン", "プリン"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected);
  });

  it("keeps the long vowel mark, which changes the name", () => {
    expect(normalizeAnswer("ルージュラ")).not.toBe(normalizeAnswer("ルジュラ"));
  });

  it("returns an empty string for input with no letters", () => {
    expect(normalizeAnswer(" !? ♀ ")).toBe("");
  });
});
