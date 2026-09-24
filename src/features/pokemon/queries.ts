import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

const LIST_COLUMNS =
  "id, name_ko, name_en, name_ja, type_1, type_2, artwork_path" as const;

/** The whole Gen 1 dex, slim columns only, ordered by dex number. */
export async function getPokedexList() {
  const { data, error } = await createPublicClient()
    .from("pokemon")
    .select(LIST_COLUMNS)
    .order("id");

  // Fail the render (and the build) rather than prerender an empty dex.
  if (error) throw new Error(`Failed to load the Pokédex: ${error.message}`);
  return data;
}

export type PokedexEntry = Awaited<ReturnType<typeof getPokedexList>>[number];
