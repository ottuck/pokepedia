import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OwnedSticker } from "./summary";

type MyCollection = {
  /** Null when there is no session: nothing to show yet. */
  userId: string | null;
  isAnonymous: boolean;
  stickers: OwnedSticker[];
};

/**
 * The signed-in player's stickers, read with their own session so RLS scopes the rows. Reading
 * the cookie makes the page render per request, which is what a personal page needs.
 */
export async function getMyCollection(): Promise<MyCollection> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { userId: null, isAnonymous: false, stickers: [] };

  const { data: stickers, error } = await supabase
    .from("user_sticker")
    .select("pokemon_id, variant, quantity");
  if (error) throw new Error(`Failed to load stickers: ${error.message}`);

  return {
    userId: claims.sub,
    isAnonymous: claims.is_anonymous === true,
    stickers,
  };
}
