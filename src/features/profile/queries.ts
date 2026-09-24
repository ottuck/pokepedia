import "server-only";
import { createClient } from "@/lib/supabase/server";
import { summarizeCollection } from "@/features/collection/summary";
import { clearRate } from "./stats";

const RECENT_RUNS = 5;
const RECENT_STICKERS = 8;

/**
 * Everything the my page shows, read with the player's own session so RLS scopes every row
 * (active rounds stay hidden, see the quiz migration). Null when there is no session yet.
 */
export async function getMyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  // RLS already limits every read to this player; the explicit filters also let Postgres
  // use the user_id indexes instead of checking the policy row by row.
  const userId = claims.sub;

  const finishedRuns = <Columns extends string>(columns: Columns) =>
    supabase
      .from("quiz_run")
      .select(columns)
      .eq("user_id", userId)
      .eq("status", "finished");
  const countRounds = (status: "cleared" | "failed") =>
    supabase
      .from("quiz_round")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", status);

  const [
    profile,
    plays,
    bestScore,
    bestCombo,
    recentRuns,
    cleared,
    failed,
    stickers,
  ] = await Promise.all([
    supabase.from("profile").select("nickname").eq("id", userId).maybeSingle(),
    supabase
      .from("quiz_run")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "finished"),
    finishedRuns("score")
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle(),
    finishedRuns("best_combo")
      .order("best_combo", { ascending: false })
      .limit(1)
      .maybeSingle(),
    finishedRuns(
      "id, score, best_combo, rounds_cleared, end_reason, finished_at",
    )
      .order("finished_at", { ascending: false })
      .limit(RECENT_RUNS),
    countRounds("cleared"),
    countRounds("failed"),
    // At most 151 × 2 rows: cheap enough to summarize in full.
    supabase
      .from("user_sticker")
      .select("pokemon_id, variant, quantity, last_obtained_at")
      .eq("user_id", userId)
      .order("last_obtained_at", { ascending: false }),
  ]);

  for (const result of [
    profile,
    plays,
    bestScore,
    bestCombo,
    recentRuns,
    cleared,
    failed,
    stickers,
  ]) {
    if (result.error)
      throw new Error(`Failed to load my page: ${result.error.message}`);
  }

  return {
    nickname: profile.data?.nickname ?? "",
    isAnonymous: claims.is_anonymous === true,
    stats: {
      plays: plays.count ?? 0,
      bestScore: bestScore.data?.score ?? 0,
      bestCombo: bestCombo.data?.best_combo ?? 0,
      clearRate: clearRate(cleared.count ?? 0, failed.count ?? 0),
    },
    collection: summarizeCollection(stickers.data ?? []),
    recentStickers: (stickers.data ?? []).slice(0, RECENT_STICKERS),
    recentRuns: recentRuns.data ?? [],
  };
}

export type MyPage = NonNullable<Awaited<ReturnType<typeof getMyPage>>>;
