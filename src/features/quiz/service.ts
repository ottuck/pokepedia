import type { Locale } from "next-intl";
import { localizedName } from "@/features/pokemon/format";
import {
  ActiveRunExistsError,
  QuizConflictError,
  type QuizRepository,
} from "./repository";
import {
  applyHint,
  flee,
  hintText,
  isCorrectAnswer,
  nameMask,
  pickNextPokemon,
  resolveAnswer,
  skipRound,
  type StickerVariant,
} from "./rules";
import type {
  ActionResult,
  AnswerResult,
  FleeResult,
  PokemonReveal,
  QuizErrorCode,
  QuizState,
  RoundRecord,
  RoundSecret,
  RoundView,
  RunRecord,
  SkipResult,
} from "./types";

type QuizServiceDeps = {
  repo: QuizRepository;
  /** Returns [0, 1). Decides the next Pokémon and the sticker variant. */
  random: () => number;
  urls: {
    artwork: (path: string) => string;
    silhouette: (path: string) => string;
  };
};

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (code: QuizErrorCode): { ok: false; code: QuizErrorCode } => ({
  ok: false,
  code,
});

/**
 * Quiz use cases: load trusted state, apply rules.ts, commit atomically, and shape what the
 * browser may see. The player is always identified by the caller (from the session), never by
 * the request body.
 */
export function createQuizService({ repo, random, urls }: QuizServiceDeps) {
  async function roundView(
    userId: string,
    round: RoundRecord,
    locale: Locale,
    /** Already loaded for this round: saves a round trip. */
    known?: RoundSecret,
  ): Promise<RoundView> {
    const secret = known ?? (await repo.findRoundSecret(userId, round.id));
    if (!secret) throw new Error(`Round ${round.id} has no quiz data`);
    const name = localizedName(
      await repo.pokemonNames(secret.pokemonId),
      locale,
    );
    return {
      id: round.id,
      seq: round.seq,
      hp: round.hp,
      hintUsed: round.hintUsed,
      mask: nameMask(name),
      hint: round.hintUsed ? hintText(name) : null,
      silhouetteUrl: urls.silhouette(secret.silhouettePath),
    };
  }

  async function reveal(
    pokemonId: number,
    locale: Locale,
    variant: StickerVariant = "normal",
  ): Promise<PokemonReveal> {
    const names = await repo.pokemonNames(pokemonId);
    const path =
      variant === "shiny" ? names.shiny_artwork_path : names.artwork_path;
    return {
      id: pokemonId,
      name: localizedName(names, locale),
      artworkUrl: urls.artwork(path),
    };
  }

  async function pickNext(seen: Set<number>): Promise<number> {
    return pickNextPokemon(await repo.allPokemonIds(), seen, random);
  }

  /** The next round created by a commit: fresh HP, next sequence number. */
  const nextRoundRecord = (
    runId: string,
    id: string,
    seq: number,
  ): RoundRecord => ({
    id,
    runId,
    seq,
    status: "active",
    hp: 3,
    attempts: 0,
    hintUsed: false,
    version: 0,
  });

  /**
   * Loads an active round of this player with its answer (and, for transitions that may start
   * a next round, the Pokémon already seen), or an error code. The reads run concurrently: each
   * is a network round trip, and they only depend on the round id.
   */
  async function loadPlayable(
    userId: string,
    roundId: string,
    { withSeen = false } = {},
  ) {
    const [found, secret, seen] = await Promise.all([
      repo.findRound(userId, roundId),
      repo.findRoundSecret(userId, roundId),
      withSeen
        ? repo.seenPokemonIds(userId, roundId)
        : Promise.resolve(new Set<number>()),
    ]);
    if (!found || !secret) return fail("not_found");
    return { ok: true as const, ...found, secret, seen };
  }

  async function commitOrConflict<T>(
    commit: () => Promise<T>,
  ): Promise<T | "conflict"> {
    try {
      return await commit();
    } catch (error) {
      if (error instanceof QuizConflictError) return "conflict";
      throw error;
    }
  }

  return {
    /** Resumes the player's run in progress, or starts a new one. */
    async startOrResume(
      userId: string,
      locale: Locale,
    ): Promise<ActionResult<QuizState>> {
      let active = await repo.findActiveRun(userId);
      if (!active) {
        const first = pickNextPokemon(
          await repo.allPokemonIds(),
          new Set(),
          random,
        );
        try {
          await repo.startRun(userId, first);
        } catch (error) {
          // Two tabs pressed PLAY at once: the other request won, so resume its run.
          if (!(error instanceof ActiveRunExistsError)) throw error;
        }
        active = await repo.findActiveRun(userId);
        if (!active) throw new Error("Run was not created");
      }
      return ok({
        run: active.run,
        round: await roundView(userId, active.round, locale),
      });
    },

    async answer(
      userId: string,
      roundId: string,
      answer: string,
      locale: Locale,
    ): Promise<ActionResult<AnswerResult>> {
      // Seen Pokémon are only needed on a clear, but fetching them alongside is free.
      const loaded = await loadPlayable(userId, roundId, { withSeen: true });
      if (!loaded.ok) return loaded;
      const { run, round, secret, seen } = loaded;

      const result = resolveAnswer(
        run,
        round,
        isCorrectAnswer(answer, secret.answerKeys),
        random,
      );
      if (!result.ok) return fail(result.error);
      const outcome = result.value;
      const nextRun: RunRecord = { ...run, ...outcome.run };
      const nextRound: RoundRecord = { ...round, ...outcome.round };
      const nextPokemonId =
        outcome.kind === "cleared" ? await pickNext(seen) : null;

      const committed = await commitOrConflict(() =>
        repo.commit({
          userId,
          round: nextRound,
          run: nextRun,
          endReason: outcome.kind === "fainted" ? "fainted" : null,
          scoreGained: outcome.kind === "cleared" ? outcome.scoreGained : null,
          sticker: outcome.kind === "cleared" ? outcome.sticker : null,
          nextPokemonId,
        }),
      );
      if (committed === "conflict") return fail("conflict");

      if (outcome.kind === "wrong") {
        return ok({
          outcome: "wrong",
          run: nextRun,
          round: await roundView(userId, nextRound, locale, secret),
        });
      }
      if (outcome.kind === "fainted") {
        return ok({
          outcome: "fainted",
          run: nextRun,
          revealed: await reveal(secret.pokemonId, locale),
        });
      }

      const quantity = committed.stickerQuantity ?? 1;
      const [revealed, upcoming] = await Promise.all([
        reveal(secret.pokemonId, locale, outcome.sticker),
        roundView(
          userId,
          nextRoundRecord(run.id, committed.nextRoundId!, round.seq + 1),
          locale,
        ),
      ]);
      return ok({
        outcome: "cleared",
        run: nextRun,
        revealed,
        scoreGained: outcome.scoreGained,
        sticker: { variant: outcome.sticker, quantity, isNew: quantity === 1 },
        nextRound: upcoming,
      });
    },

    async hint(
      userId: string,
      roundId: string,
      locale: Locale,
    ): Promise<ActionResult<{ run: RunRecord; round: RoundView }>> {
      const loaded = await loadPlayable(userId, roundId);
      if (!loaded.ok) return loaded;

      const result = applyHint(loaded.run, loaded.round);
      if (!result.ok) return fail(result.error);
      const run = { ...loaded.run, ...result.value.run };
      const round = { ...loaded.round, ...result.value.round };

      const committed = await commitOrConflict(() =>
        repo.commit({
          userId,
          round,
          run,
          endReason: null,
          scoreGained: null,
          sticker: null,
          nextPokemonId: null,
        }),
      );
      if (committed === "conflict") return fail("conflict");
      return ok({
        run,
        round: await roundView(userId, round, locale, loaded.secret),
      });
    },

    async skip(
      userId: string,
      roundId: string,
      locale: Locale,
    ): Promise<ActionResult<SkipResult>> {
      const loaded = await loadPlayable(userId, roundId, { withSeen: true });
      if (!loaded.ok) return loaded;

      const result = skipRound(loaded.run, loaded.round);
      if (!result.ok) return fail(result.error);
      const run = { ...loaded.run, ...result.value.run };
      const nextPokemonId = await pickNext(loaded.seen);

      const committed = await commitOrConflict(() =>
        repo.commit({
          userId,
          round: { ...loaded.round, ...result.value.round },
          run,
          endReason: null,
          scoreGained: null,
          sticker: null,
          nextPokemonId,
        }),
      );
      if (committed === "conflict") return fail("conflict");
      // Skipping shows who it was, so the player still learns something.
      const [revealed, nextRound] = await Promise.all([
        reveal(loaded.secret.pokemonId, locale),
        roundView(
          userId,
          nextRoundRecord(run.id, committed.nextRoundId!, loaded.round.seq + 1),
          locale,
        ),
      ]);
      return ok({ run, revealed, nextRound });
    },

    /** Ends the player's run in progress (legacy "run away"). */
    async flee(
      userId: string,
      locale: Locale,
    ): Promise<ActionResult<FleeResult>> {
      const active = await repo.findActiveRun(userId);
      if (!active) return fail("run_not_active");
      const secret = await repo.findRoundSecret(userId, active.round.id);
      if (!secret) return fail("not_found");

      const result = flee(active.run);
      if (!result.ok) return fail(result.error);
      const run = { ...active.run, ...result.value };

      const committed = await commitOrConflict(() =>
        repo.commit({
          userId,
          round: { ...active.round, status: "skipped" },
          run,
          endReason: "fled",
          scoreGained: null,
          sticker: null,
          nextPokemonId: null,
        }),
      );
      if (committed === "conflict") return fail("conflict");
      return ok({ run, revealed: await reveal(secret.pokemonId, locale) });
    },
  };
}
