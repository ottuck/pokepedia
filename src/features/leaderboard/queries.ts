import "server-only";
import type { Locale } from "next-intl";
import { createPublicClient } from "@/lib/supabase/public";

const LEADERBOARD_SIZE = 50;

/**
 * Top players by their best single game. `leaderboard_entries` is the only public view of
 * quiz_run/profile: name (a generated name's words in the viewer's language), the profile
 * Pokémon, score and best combo only (see the generated nicknames migration).
 * No cookies are read, so the page can be cached and revalidated.
 *
 * Null when it cannot be loaded. Vercel builds and the Supabase migration deploy in parallel,
 * so a build can run before the function exists; failing soft keeps that build green, and
 * the page's 60 s revalidation picks the ranking up once the function is there.
 */
export async function getLeaderboard(locale: Locale) {
  const { data, error } = await createPublicClient().rpc(
    "leaderboard_entries",
    { p_locale: locale, p_limit: LEADERBOARD_SIZE },
  );
  if (error) {
    console.error("[leaderboard] load failed:", error.message);
    return null;
  }
  return data;
}
