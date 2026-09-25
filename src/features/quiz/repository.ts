import type { StickerVariant } from "./rules";
import type {
  PokemonNames,
  RoundRecord,
  RoundSecret,
  RunRecord,
} from "./types";

export class QuizConflictError extends Error {
  constructor() {
    super("The round changed since it was read");
    this.name = "QuizConflictError";
  }
}

export class ActiveRunExistsError extends Error {
  constructor() {
    super("The player already has an active run");
    this.name = "ActiveRunExistsError";
  }
}

export type CommitInput = {
  userId: string;
  round: RoundRecord;
  run: RunRecord;
  endReason: "fainted" | "fled" | null;
  scoreGained: number | null;
  sticker: StickerVariant | null;
  nextPokemonId: number | null;
};

/**
 * Everything the quiz needs from storage. The Supabase implementation lives in
 * repository.supabase.ts; tests use an in-memory one. Every read is scoped to `userId`.
 */
export interface QuizRepository {
  findActiveRun(
    userId: string,
  ): Promise<{ run: RunRecord; round: RoundRecord } | null>;
  /** A round of this player, in any status, with its run. */
  findRound(
    userId: string,
    roundId: string,
  ): Promise<{ run: RunRecord; round: RoundRecord } | null>;
  findRoundSecret(userId: string, roundId: string): Promise<RoundSecret | null>;
  /** Pokémon already met in the run this round belongs to (the round's own included). */
  seenPokemonIds(userId: string, roundId: string): Promise<Set<number>>;
  /** Catalog reads: static between syncs, so implementations may cache them. */
  allPokemonIds(): Promise<number[]>;
  pokemonNames(pokemonId: number): Promise<PokemonNames>;
  /** Throws ActiveRunExistsError when the player already has an active run. */
  startRun(
    userId: string,
    pokemonId: number,
  ): Promise<{ runId: string; roundId: string }>;
  /**
   * Applies a transition atomically. Throws QuizConflictError when the round is no longer
   * active or its version changed (e.g. a double-submitted answer).
   */
  commit(
    input: CommitInput,
  ): Promise<{ stickerQuantity: number | null; nextRoundId: string | null }>;
}
