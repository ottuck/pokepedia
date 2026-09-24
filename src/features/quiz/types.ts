import type { RoundState, RuleError, RunState, StickerVariant } from "./rules";

// ── What the server stores ─────────────────────────────────────────────────────────

export type RunRecord = RunState & { id: string };

export type RoundRecord = RoundState & {
  id: string;
  runId: string;
  seq: number;
  /** Optimistic-lock version read with the round; commits must name it. */
  version: number;
};

export type RoundSecret = {
  pokemonId: number;
  answerKeys: string[];
  silhouettePath: string;
};

export type PokemonNames = {
  id: number;
  name_ko: string;
  name_en: string;
  name_ja: string;
  artwork_path: string;
  shiny_artwork_path: string;
};

// ── What the browser sees ──────────────────────────────────────────────────────────
// Never includes the Pokémon of a round still in play: only its silhouette (opaque file
// name) and a mask of its name.

export type RunView = RunState & { id: string };

export type RoundView = {
  id: string;
  seq: number;
  hp: number;
  hintUsed: boolean;
  /** "???" per letter of the name in the player's language. */
  mask: string;
  /** Half the name, once the hint has been used. */
  hint: string | null;
  silhouetteUrl: string;
};

export type PokemonReveal = { id: number; name: string; artworkUrl: string };

export type QuizState = { run: RunView; round: RoundView };

export type AnswerResult =
  | { outcome: "wrong"; run: RunView; round: RoundView }
  | { outcome: "fainted"; run: RunView; revealed: PokemonReveal }
  | {
      outcome: "cleared";
      run: RunView;
      revealed: PokemonReveal;
      scoreGained: number;
      sticker: { variant: StickerVariant; quantity: number; isNew: boolean };
      nextRound: RoundView;
    };

export type SkipResult = {
  run: RunView;
  revealed: PokemonReveal;
  nextRound: RoundView;
};

export type FleeResult = { run: RunView; revealed: PokemonReveal };

export type QuizErrorCode =
  | RuleError
  | "unauthenticated"
  | "sign_in_failed"
  | "invalid_input"
  | "not_found"
  | "conflict"
  /** Anything unexpected; the cause is logged on the server, never sent to the browser. */
  | "server_error";

/** Server Action result: codes, never messages; the UI translates them. */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: QuizErrorCode };
