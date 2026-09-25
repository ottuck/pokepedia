import type { Locale } from "next-intl";
import { announceAccountChange } from "@/features/auth/account-events";
import { create } from "zustand";
import {
  fleeQuiz,
  requestHint,
  skipQuizRound,
  startQuiz,
  submitAnswer,
} from "./actions";
import type { StickerVariant } from "./rules";
import type {
  ActionResult,
  PokemonReveal,
  QuizErrorCode,
  RoundView,
  RunView,
} from "./types";

/** A failed request (network, server crash) becomes an error code instead of a rejection. */
async function call<T>(
  action: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, code: "server_error" };
  }
}

/**
 * Battle flow. The server decides every outcome; phases only sequence how the client plays
 * back each result (animations run between phases, see BattleStage).
 *
 *   lobby → starting → intro → menu ⇄ answering → judging ─┬→ hit → menu
 *                                                           ├→ reveal → reward → intro (next)
 *                                                           └→ gameover
 */
export type QuizPhase =
  | "lobby"
  | "starting"
  | "intro"
  | "menu"
  | "answering"
  | "judging"
  | "hit"
  | "reveal"
  | "reward"
  | "gameover";

type Reward = {
  revealed: PokemonReveal;
  scoreGained: number;
  sticker: { variant: StickerVariant; quantity: number; isNew: boolean };
};

type GameOver = { reason: "fainted" | "fled"; revealed: PokemonReveal };

type QuizStore = {
  phase: QuizPhase;
  run: RunView | null;
  round: RoundView | null;
  /** The round after a clear or skip, shown once the reveal/reward is done. */
  nextRound: RoundView | null;
  reward: Reward | null;
  /** A skipped Pokémon, named in the message box while the next one comes in. */
  skipped: PokemonReveal | null;
  gameOver: GameOver | null;
  stickersThisRun: Array<{ revealed: PokemonReveal; variant: StickerVariant }>;
  error: QuizErrorCode | null;

  start(locale: Locale): Promise<void>;
  openAnswer(): void;
  closeAnswer(): void;
  answer(answer: string, locale: Locale): Promise<void>;
  hint(locale: Locale): Promise<void>;
  skip(locale: Locale): Promise<void>;
  flee(locale: Locale): Promise<void>;
  /** Called when the current phase's animation has finished. */
  advance(): void;
  reset(): void;
};

const initial = {
  phase: "lobby" as QuizPhase,
  run: null,
  round: null,
  nextRound: null,
  reward: null,
  skipped: null,
  gameOver: null,
  stickersThisRun: [],
  error: null,
};

export const useQuizStore = create<QuizStore>((set, get) => {
  /** A conflict means another tab moved the game on: resync from the server. */
  async function recover(code: QuizErrorCode, locale: Locale) {
    set({ error: code });
    if (
      code === "conflict" ||
      code === "round_not_active" ||
      code === "not_found"
    ) {
      const resumed = await call(() => startQuiz({ locale }));
      if (resumed.ok)
        set({
          run: resumed.data.run,
          round: resumed.data.round,
          phase: "menu",
        });
    } else if (get().phase === "judging") {
      set({ phase: "answering" });
    }
  }

  return {
    ...initial,

    async start(locale) {
      set({ ...initial, phase: "starting" });
      const result = await call(() => startQuiz({ locale }));
      if (!result.ok) return set({ phase: "lobby", error: result.code });
      // A first game signs the player in as a guest on the server; tell the header.
      announceAccountChange();
      set({ run: result.data.run, round: result.data.round, phase: "intro" });
    },

    openAnswer() {
      if (get().phase === "menu") set({ phase: "answering", error: null });
    },

    closeAnswer() {
      if (get().phase === "answering") set({ phase: "menu" });
    },

    async answer(answer, locale) {
      const { round, phase } = get();
      if (!round || phase !== "answering" || answer.trim() === "") return;
      set({ phase: "judging", error: null });

      const result = await call(() =>
        submitAnswer({ roundId: round.id, answer, locale }),
      );
      if (!result.ok) return recover(result.code, locale);
      const data = result.data;

      if (data.outcome === "wrong") {
        set({ run: data.run, round: data.round, phase: "hit" });
      } else if (data.outcome === "fainted") {
        set({
          run: data.run,
          round: { ...round, hp: 0 },
          gameOver: { reason: "fainted", revealed: data.revealed },
          phase: "hit",
        });
      } else {
        const reward = {
          revealed: data.revealed,
          scoreGained: data.scoreGained,
          sticker: data.sticker,
        };
        set((state) => ({
          run: data.run,
          reward,
          nextRound: data.nextRound,
          stickersThisRun: [
            ...state.stickersThisRun,
            { revealed: data.revealed, variant: data.sticker.variant },
          ],
          phase: "reveal",
        }));
      }
    },

    async hint(locale) {
      const { round, phase } = get();
      if (!round || phase !== "menu" || round.hintUsed) return;
      const result = await call(() =>
        requestHint({ roundId: round.id, locale }),
      );
      if (!result.ok) return recover(result.code, locale);
      set({ run: result.data.run, round: result.data.round });
    },

    async skip(locale) {
      const { round, phase } = get();
      if (!round || phase !== "menu") return;
      const result = await call(() =>
        skipQuizRound({ roundId: round.id, locale }),
      );
      if (!result.ok) return recover(result.code, locale);
      set({
        run: result.data.run,
        round: result.data.nextRound,
        skipped: result.data.revealed,
        phase: "intro",
      });
    },

    async flee(locale) {
      if (get().phase !== "menu") return;
      const result = await call(() => fleeQuiz({ locale }));
      if (!result.ok) return recover(result.code, locale);
      set({
        run: result.data.run,
        gameOver: { reason: "fled", revealed: result.data.revealed },
        phase: "gameover",
      });
    },

    advance() {
      const { phase, gameOver, nextRound } = get();
      if (phase === "intro") set({ phase: "menu", skipped: null });
      else if (phase === "hit") set({ phase: gameOver ? "gameover" : "menu" });
      else if (phase === "reveal") set({ phase: "reward" });
      else if (phase === "reward" && nextRound) {
        set({
          round: nextRound,
          nextRound: null,
          reward: null,
          phase: "intro",
        });
      }
    },

    reset() {
      set(initial);
    },
  };
});
