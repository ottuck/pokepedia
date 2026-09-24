import { describe, expect, it } from "vitest";
import {
  applyHint,
  comboMultiplier,
  flee,
  hintText,
  isCorrectAnswer,
  nameMask,
  newRound,
  newRun,
  pickNextPokemon,
  resolveAnswer,
  scoreForClear,
  shinyChance,
  skipRound,
  type RoundState,
  type RunState,
} from "./rules";

const always = (value: number) => () => value;
const NEVER_SHINY = always(0.99);
const ALWAYS_SHINY = always(0);

function unwrap<T>(
  result: { ok: true; value: T } | { ok: false; error: string },
): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const answer = (
  run: RunState,
  round: RoundState,
  correct: boolean,
  random = NEVER_SHINY,
) => unwrap(resolveAnswer(run, round, correct, random));

describe("isCorrectAnswer", () => {
  const pikachu = ["피카츄", "pikachu", "ピカチュウ"];

  it.each(["피카츄", "Pikachu", " PIKACHU ", "ぴかちゅう", "ピカチュウ"])(
    "accepts %s",
    (input) => {
      expect(isCorrectAnswer(input, pikachu)).toBe(true);
    },
  );

  it.each(["피카", "raichu", "", "   ", "!!"])("rejects %j", (input) => {
    expect(isCorrectAnswer(input, pikachu)).toBe(false);
  });
});

describe("scoring", () => {
  it("pays more for fewer mistakes", () => {
    expect([3, 2, 1].map((hp) => scoreForClear(hp, false, 1))).toEqual([
      100, 60, 30,
    ]);
  });

  it("halves the score when the hint was used", () => {
    expect(scoreForClear(3, true, 1)).toBe(50);
  });

  it("adds 10% per combo after the first, capped at ×2.0", () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(5)).toBeCloseTo(1.4);
    expect(comboMultiplier(11)).toBeCloseTo(2);
    expect(comboMultiplier(40)).toBeCloseTo(2);
    expect(scoreForClear(3, false, 11)).toBe(200);
  });
});

describe("shinyChance", () => {
  it.each([
    [1, 0.05],
    [4, 0.05],
    [5, 0.1],
    [9, 0.1],
    [10, 0.2],
    [30, 0.2],
  ])("combo %i → %f", (combo, chance) => {
    expect(shinyChance(combo, false)).toBe(chance);
  });

  it("falls back to the base chance for a hinted clear", () => {
    expect(shinyChance(12, true)).toBe(0.05);
  });
});

describe("resolveAnswer", () => {
  it("clears a round: score, combo, best combo and a sticker", () => {
    const result = answer(
      { ...newRun(), combo: 4, bestCombo: 4 },
      newRound(),
      true,
      ALWAYS_SHINY,
    );

    expect(result).toMatchObject({
      kind: "cleared",
      scoreGained: 140, // 100 × 1.4 at combo 5
      sticker: "shiny",
      run: {
        combo: 5,
        bestCombo: 5,
        score: 140,
        roundsCleared: 1,
        status: "active",
      },
      round: { status: "cleared", attempts: 1, hp: 3 },
    });
  });

  it("uses the injected random for the variant", () => {
    const run = newRun(); // combo 1 after clearing → 5%
    expect(answer(run, newRound(), true, always(0.049))).toMatchObject({
      sticker: "shiny",
    });
    expect(answer(run, newRound(), true, always(0.05))).toMatchObject({
      sticker: "normal",
    });
  });

  it("costs one HP and the combo on a wrong answer", () => {
    const result = answer(
      { ...newRun(), combo: 3, bestCombo: 3 },
      newRound(),
      false,
    );

    expect(result).toMatchObject({
      kind: "wrong",
      run: { combo: 0, bestCombo: 3, status: "active" },
      round: { hp: 2, attempts: 1, status: "active" },
    });
  });

  it("scores by HP left after earlier mistakes", () => {
    const afterTwoMisses: RoundState = { ...newRound(), hp: 1, attempts: 2 };
    expect(answer(newRun(), afterTwoMisses, true)).toMatchObject({
      scoreGained: 30,
    });
  });

  it("faints on the third miss, failing the round and ending the run", () => {
    const lastHp: RoundState = { ...newRound(), hp: 1, attempts: 2 };
    const result = answer({ ...newRun(), score: 500 }, lastHp, false);

    expect(result).toMatchObject({
      kind: "fainted",
      run: { status: "finished", score: 500, combo: 0 },
      round: { status: "failed", hp: 0, attempts: 3 },
    });
  });

  it("refuses answers once the round or run is over", () => {
    const cleared: RoundState = { ...newRound(), status: "cleared" };
    const finished: RunState = { ...newRun(), status: "finished" };

    expect(resolveAnswer(newRun(), cleared, true, NEVER_SHINY)).toEqual({
      ok: false,
      error: "round_not_active",
    });
    expect(resolveAnswer(finished, newRound(), true, NEVER_SHINY)).toEqual({
      ok: false,
      error: "run_not_active",
    });
  });

  it("plays out a whole run", () => {
    let run = newRun();
    // Clear, clear, miss then clear, then faint.
    run = answer(run, newRound(), true).run;
    run = answer(run, newRound(), true).run;
    const missed = answer(run, newRound(), false);
    run = answer(missed.run, missed.round, true).run;
    let round = newRound();
    for (let i = 0; i < 2; i++) ({ run, round } = answer(run, round, false));
    const end = answer(run, round, false);

    expect(end.kind).toBe("fainted");
    expect(end.run).toMatchObject({
      status: "finished",
      roundsCleared: 3,
      bestCombo: 2,
      score: 100 + 110 + 60, // combo 1, combo 2, then combo 1 again with 2 HP
    });
  });
});

describe("applyHint / skipRound / flee", () => {
  it("hints once per round and breaks the combo", () => {
    const hinted = unwrap(applyHint({ ...newRun(), combo: 6 }, newRound()));
    expect(hinted).toMatchObject({
      run: { combo: 0 },
      round: { hintUsed: true },
    });
    expect(applyHint(hinted.run, hinted.round)).toEqual({
      ok: false,
      error: "hint_already_used",
    });
  });

  it("scores a hinted clear at half and restarts the combo", () => {
    const hinted = unwrap(applyHint({ ...newRun(), combo: 6 }, newRound()));
    expect(answer(hinted.run, hinted.round, true)).toMatchObject({
      scoreGained: 50,
      run: { combo: 1 },
    });
  });

  it("skips up to three times per run, without points or a sticker", () => {
    let run = { ...newRun(), combo: 2 };
    for (let i = 0; i < 3; i++) {
      const skipped = unwrap(skipRound(run, newRound()));
      expect(skipped.round.status).toBe("skipped");
      run = skipped.run;
    }
    expect(run).toMatchObject({ skipsLeft: 0, combo: 0, score: 0 });
    expect(skipRound(run, newRound())).toEqual({
      ok: false,
      error: "no_skips_left",
    });
  });

  it("flees an active run only", () => {
    const fled = unwrap(flee(newRun()));
    expect(fled.status).toBe("finished");
    expect(flee(fled)).toEqual({ ok: false, error: "run_not_active" });
  });
});

describe("pickNextPokemon", () => {
  const ids = [1, 2, 3, 4];

  it("picks among Pokémon not seen in this run", () => {
    const seen = new Set([1, 2, 3]);
    expect(pickNextPokemon(ids, seen, always(0))).toBe(4);
    expect(pickNextPokemon(ids, seen, always(0.99))).toBe(4);
  });

  it("allows repeats once every Pokémon has appeared", () => {
    expect(pickNextPokemon(ids, new Set(ids), always(0.99))).toBe(4);
  });
});

describe("nameMask / hintText", () => {
  it.each([
    ["피카츄", "???", "피??"],
    ["Pikachu", "???????", "Pik????"],
    ["Mr. Mime", "??. ????", "Mr. M???"],
    ["ピカチュウ", "?????", "ピカ???"],
    ["뮤", "?", "?"], // a one-letter hint must not give the answer away
    ["Mew", "???", "M??"],
    ["Nidoran♀", "???????♀", "Nid????♀"],
  ])("%s → %s / %s", (name, mask, hint) => {
    expect(nameMask(name)).toBe(mask);
    expect(hintText(name)).toBe(hint);
  });
});
