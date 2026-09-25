import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export const LEADERBOARD_SIZE = 50;

/**
 * Top players by their best single game. The `leaderboard` function is the only public view
 * of quiz_run/profile and returns nickname, score and best combo only (see its migration).
 * No cookies are read, so the page can be cached and revalidated.
 *
 * Null when it cannot be loaded. Vercel builds and the Supabase migration deploy in parallel,
 * so a build can run before `leaderboard` exists; failing soft keeps that build green, and
 * the page's 60 s revalidation picks the ranking up once the function is there.
 */
export async function getLeaderboard() {
  const { data, error } = await createPublicClient().rpc("leaderboard", {
    p_limit: LEADERBOARD_SIZE,
  });
  if (error) {
    console.error("[leaderboard] load failed:", error.message);
    return null;
  }
  return data;
}

export type LeaderboardRow = NonNullable<
  Awaited<ReturnType<typeof getLeaderboard>>
>[number];
