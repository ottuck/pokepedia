import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  ActiveRunExistsError,
  QuizConflictError,
  type CommitInput,
  type QuizRepository,
} from "./repository";
import { RULES } from "./rules";
import type { PokemonNames, RoundRecord, RunRecord } from "./types";

type Client = SupabaseClient<Database>;
type RunRow = Database["public"]["Tables"]["quiz_run"]["Row"];
type RoundRow = Database["public"]["Tables"]["quiz_round"]["Row"];

const toRun = (row: RunRow): RunRecord => ({
  id: row.id,
  status: row.status,
  score: row.score,
  combo: row.combo,
  bestCombo: row.best_combo,
  roundsCleared: row.rounds_cleared,
  skipsLeft: row.skips_left,
});

const toRound = (row: RoundRow): RoundRecord => ({
  id: row.id,
  runId: row.run_id,
  seq: row.seq,
  status: row.status,
  hp: row.hp,
  attempts: row.attempts,
  hintUsed: row.hint_used,
  version: row.version,
});

// Supabase responses are a union ({ data, error: null } | { data: null, error }), so the
// helpers take the whole response type and read `data` from it.
type Response = { data: unknown; error: { message: string } | null };

/** A row that may be missing (maybeSingle). */
function maybe<R extends Response>(
  result: R,
  what: string,
): NonNullable<R["data"]> | null {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return (result.data ?? null) as NonNullable<R["data"]> | null;
}

/** A row that must exist, or a list (never null without an error). */
function one<R extends Response>(
  result: R,
  what: string,
): NonNullable<R["data"]> {
  const data = maybe(result, what);
  if (data === null) throw new Error(`${what}: no data`);
  return data;
}

type CatalogEntry = PokemonNames;

/**
 * The Gen 1 catalog (ids, names, artwork paths), read once per server instance. It only
 * changes through a sync, which is followed by a redeploy, so it never goes stale in practice.
 * Before this, every answer re-read it: several of the sequential round trips per click.
 */
let catalog: Promise<Map<number, CatalogEntry>> | null = null;

function loadCatalog(db: Client) {
  catalog ??= (async () => {
    const rows = one(
      await db
        .from("pokemon")
        .select(
          "id, name_ko, name_en, name_ja, artwork_path, shiny_artwork_path",
        )
        .order("id"),
      "Pokémon catalog",
    );
    return new Map(rows.map((row) => [row.id, row]));
  })();
  // A failed load is retried by the next request instead of being cached.
  catalog.catch(() => (catalog = null));
  return catalog;
}

/**
 * Quiz storage backed by the secret-key client. The game tables are not writable by players,
 * so every query here filters by the user id the server derived from the session.
 */
export function createSupabaseQuizRepository(db: Client): QuizRepository {
  return {
    async findActiveRun(userId) {
      const run = maybe(
        await db
          .from("quiz_run")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
        "find active run",
      );
      if (!run) return null;
      const round = maybe(
        await db
          .from("quiz_round")
          .select("*")
          .eq("run_id", run.id)
          .eq("status", "active")
          .maybeSingle(),
        "find active round",
      );
      // An active run always has an active round; anything else is corrupt state.
      if (!round) throw new Error(`Active run ${run.id} has no active round`);
      return { run: toRun(run), round: toRound(round) };
    },

    async findRound(userId, roundId) {
      const round = maybe(
        await db
          .from("quiz_round")
          .select("*, quiz_run(*)")
          .eq("id", roundId)
          .eq("user_id", userId)
          .maybeSingle(),
        "find round",
      );
      if (!round?.quiz_run) return null;
      return { run: toRun(round.quiz_run), round: toRound(round) };
    },

    async findRoundSecret(userId, roundId) {
      const rows = one(
        await db.rpc("quiz_round_secret", {
          p_user_id: userId,
          p_round_id: roundId,
        }),
        "round secret",
      );
      const row = rows[0];
      return row
        ? {
            pokemonId: row.pokemon_id,
            answerKeys: row.answer_keys,
            silhouettePath: row.silhouette_path,
          }
        : null;
    },

    async seenPokemonIds(userId, roundId) {
      // One query from the round id alone: its run's rounds, embedded. This lets the service
      // fetch it alongside the round instead of after it.
      const row = maybe(
        await db
          .from("quiz_round")
          .select("quiz_run(quiz_round(pokemon_id))")
          .eq("id", roundId)
          .eq("user_id", userId)
          .maybeSingle(),
        "seen Pokémon",
      );
      return new Set(
        (row?.quiz_run?.quiz_round ?? []).map((round) => round.pokemon_id),
      );
    },

    async allPokemonIds() {
      return [...(await loadCatalog(db)).keys()];
    },

    async pokemonNames(pokemonId) {
      const entry = (await loadCatalog(db)).get(pokemonId);
      if (!entry)
        throw new Error(`Pokémon #${pokemonId} is not in the catalog`);
      return entry;
    },

    async startRun(userId, pokemonId) {
      const { data, error } = await db.rpc("quiz_start_run", {
        p_user_id: userId,
        p_pokemon_id: pokemonId,
        p_hp: RULES.maxHp,
        p_skips: RULES.skipsPerRun,
      });
      if (error?.code === "23505") throw new ActiveRunExistsError();
      if (error) throw new Error(`start run: ${error.message}`);
      return { runId: data[0].run_id, roundId: data[0].round_id };
    },

    async commit(input: CommitInput) {
      const { round, run } = input;
      const { data, error } = await db.rpc("quiz_commit", {
        p_user_id: input.userId,
        p_round_id: round.id,
        p_expected_version: round.version,
        p_round: {
          status: round.status,
          hp: round.hp,
          attempts: round.attempts,
          hint_used: round.hintUsed,
          score_gained: input.scoreGained,
        },
        p_run: {
          status: run.status,
          end_reason: input.endReason,
          score: run.score,
          combo: run.combo,
          best_combo: run.bestCombo,
          rounds_cleared: run.roundsCleared,
          skips_left: run.skipsLeft,
        },
        p_sticker_variant: input.sticker ?? undefined,
        p_next_pokemon_id: input.nextPokemonId ?? undefined,
        p_next_hp: input.nextPokemonId === null ? undefined : RULES.maxHp,
      });
      if (error?.message === "quiz_conflict") throw new QuizConflictError();
      if (error) throw new Error(`commit: ${error.message}`);
      // Generated types mark these non-null, but the function returns null when unused.
      const row = data[0] as {
        sticker_quantity: number | null;
        next_round_id: string | null;
      };
      return {
        stickerQuantity: row.sticker_quantity,
        nextRoundId: row.next_round_id,
      };
    },
  };
}
