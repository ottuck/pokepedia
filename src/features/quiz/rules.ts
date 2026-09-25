import { normalizeAnswer } from "./normalize";

/**
 * Silhouette quiz rules as pure functions. The server applies them to trusted state from the
 * database and persists the result atomically; the client never decides outcomes.
 *
 * Legacy rules: 3 HP per round, one hint, skip, flee. Remake additions: score, combo, shiny.
 */
export const RULES = {
  maxHp: 3,
  skipsPerRun: 3,
  /** Points for clearing a round, by HP left (3 = first try). */
  baseScore: { 3: 100, 2: 60, 1: 30 } as Record<number, number>,
  hintMultiplier: 0.5,
  /** Each combo after the first adds 10%, up to +100% (×2.0) at combo 11. */
  comboBonusPerStep: 0.1,
  comboBonusMaxSteps: 10,
  /** Shiny odds by combo reached with this clear; the first matching tier applies. */
  shinyTiers: [
    { minCombo: 10, chance: 0.2 },
    { minCombo: 5, chance: 0.1 },
    { minCombo: 0, chance: 0.05 },
  ],
  /** A hinted clear still rewards a sticker, but only at the base shiny chance. */
  hintedShinyChance: 0.05,
} as const;

export type RunState = {
  status: "active" | "finished";
  score: number;
  combo: number;
  bestCombo: number;
  roundsCleared: number;
  skipsLeft: number;
};

export type RoundState = {
  status: "active" | "cleared" | "failed" | "skipped";
  hp: number;
  attempts: number;
  hintUsed: boolean;
};

export type StickerVariant = "normal" | "shiny";

export type RuleError =
  "run_not_active" | "round_not_active" | "hint_already_used" | "no_skips_left";

type Result<T> = { ok: true; value: T } | { ok: false; error: RuleError };

const fail = (error: RuleError): { ok: false; error: RuleError } => ({
  ok: false,
  error,
});

export function newRun(): RunState {
  return {
    status: "active",
    score: 0,
    combo: 0,
    bestCombo: 0,
    roundsCleared: 0,
    skipsLeft: RULES.skipsPerRun,
  };
}

export function newRound(): RoundState {
  return { status: "active", hp: RULES.maxHp, attempts: 0, hintUsed: false };
}

/** True when the answer, in any supported language, names the Pokémon. */
export function isCorrectAnswer(
  answer: string,
  answerKeys: readonly string[],
): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && answerKeys.includes(normalized);
}

export function comboMultiplier(combo: number): number {
  const steps = Math.min(Math.max(combo - 1, 0), RULES.comboBonusMaxSteps);
  return 1 + steps * RULES.comboBonusPerStep;
}

/** Points for a clear with `hp` left, given the combo reached by this clear. */
export function scoreForClear(
  hp: number,
  hintUsed: boolean,
  combo: number,
): number {
  const base = RULES.baseScore[hp] ?? 0;
  const hint = hintUsed ? RULES.hintMultiplier : 1;
  return Math.round(base * hint * comboMultiplier(combo));
}

export function shinyChance(combo: number, hintUsed: boolean): number {
  if (hintUsed) return RULES.hintedShinyChance;
  return RULES.shinyTiers.find((tier) => combo >= tier.minCombo)!.chance;
}

type AnswerOutcome =
  | { kind: "wrong"; run: RunState; round: RoundState }
  | { kind: "fainted"; run: RunState; round: RoundState }
  | {
      kind: "cleared";
      run: RunState;
      round: RoundState;
      scoreGained: number;
      sticker: StickerVariant;
    };

/**
 * Applies one answer. `random` returns [0, 1) and decides the sticker variant; it is injected
 * so tests are deterministic.
 */
export function resolveAnswer(
  run: RunState,
  round: RoundState,
  correct: boolean,
  random: () => number,
): Result<AnswerOutcome> {
  if (run.status !== "active") return fail("run_not_active");
  if (round.status !== "active") return fail("round_not_active");

  const attempts = round.attempts + 1;

  if (!correct) {
    const hp = round.hp - 1;
    if (hp > 0) {
      return {
        ok: true,
        value: {
          kind: "wrong",
          run: { ...run, combo: 0 },
          round: { ...round, hp, attempts },
        },
      };
    }
    // Legacy: the trainer faints after three misses, which ends the run.
    return {
      ok: true,
      value: {
        kind: "fainted",
        run: { ...run, combo: 0, status: "finished" },
        round: { ...round, hp: 0, attempts, status: "failed" },
      },
    };
  }

  const combo = run.combo + 1;
  const scoreGained = scoreForClear(round.hp, round.hintUsed, combo);
  const sticker: StickerVariant =
    random() < shinyChance(combo, round.hintUsed) ? "shiny" : "normal";

  return {
    ok: true,
    value: {
      kind: "cleared",
      scoreGained,
      sticker,
      run: {
        ...run,
        combo,
        bestCombo: Math.max(run.bestCombo, combo),
        score: run.score + scoreGained,
        roundsCleared: run.roundsCleared + 1,
      },
      round: { ...round, attempts, status: "cleared" },
    },
  };
}

export function applyHint(
  run: RunState,
  round: RoundState,
): Result<{ run: RunState; round: RoundState }> {
  if (run.status !== "active") return fail("run_not_active");
  if (round.status !== "active") return fail("round_not_active");
  if (round.hintUsed) return fail("hint_already_used");
  return {
    ok: true,
    value: { run: { ...run, combo: 0 }, round: { ...round, hintUsed: true } },
  };
}

export function skipRound(
  run: RunState,
  round: RoundState,
): Result<{ run: RunState; round: RoundState }> {
  if (run.status !== "active") return fail("run_not_active");
  if (round.status !== "active") return fail("round_not_active");
  if (run.skipsLeft <= 0) return fail("no_skips_left");
  return {
    ok: true,
    value: {
      run: { ...run, combo: 0, skipsLeft: run.skipsLeft - 1 },
      round: { ...round, status: "skipped" },
    },
  };
}

export function flee(run: RunState): Result<RunState> {
  if (run.status !== "active") return fail("run_not_active");
  return { ok: true, value: { ...run, status: "finished" } };
}

/** A Pokémon not yet seen in this run; once all are seen, any Pokémon. */
export function pickNextPokemon(
  allIds: readonly number[],
  seenIds: ReadonlySet<number>,
  random: () => number,
): number {
  const unseen = allIds.filter((id) => !seenIds.has(id));
  const pool = unseen.length > 0 ? unseen : allIds;
  if (pool.length === 0) throw new Error("No Pokémon to pick from");
  return pool[Math.floor(random() * pool.length)];
}

/** "???" for each letter, keeping spaces and punctuation so "Mr. Mime" reads "??. ????". */
export function nameMask(name: string): string {
  return Array.from(name, (char) =>
    /[\p{L}\p{N}ー]/u.test(char) ? "?" : char,
  ).join("");
}

/**
 * The legacy hint: the first half of the name revealed, rest masked. Rounds down, so a
 * one-letter name (뮤) reveals nothing rather than the whole answer.
 */
export function hintText(name: string): string {
  const chars = Array.from(name);
  const letters = chars.filter((char) => /[\p{L}\p{N}ー]/u.test(char)).length;
  let reveal = Math.floor(letters / 2);
  return chars
    .map((char) => {
      if (!/[\p{L}\p{N}ー]/u.test(char)) return char;
      if (reveal > 0) {
        reveal--;
        return char;
      }
      return "?";
    })
    .join("");
}
