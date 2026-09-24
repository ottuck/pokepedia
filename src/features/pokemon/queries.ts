import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";

const LIST_COLUMNS =
  "id, name_ko, name_en, name_ja, type_1, type_2, artwork_path, shiny_artwork_path, evolves_from_id, evolution" as const;

/**
 * The whole Gen 1 dex, slim columns only, ordered by dex number. Also carries the evolution
 * links, so detail pages can build an evolution line without another query.
 * `cache` dedupes calls within one render (e.g. generateMetadata + page).
 */
export const getPokedexList = cache(async () => {
  const { data, error } = await createPublicClient()
    .from("pokemon")
    .select(LIST_COLUMNS)
    .order("id");

  // Fail the render (and the build) rather than prerender an empty dex.
  if (error) throw new Error(`Failed to load the Pokédex: ${error.message}`);
  return data;
});

export type PokedexEntry = Awaited<ReturnType<typeof getPokedexList>>[number];

/** Full row with abilities, or null when the id is not in the dex. */
export const getPokemonDetail = cache(async (id: number) => {
  const { data, error } = await createPublicClient()
    .from("pokemon")
    .select("*, pokemon_ability(slot, is_hidden, ability(*))")
    .eq("id", id)
    .order("slot", { referencedTable: "pokemon_ability" })
    .maybeSingle();

  if (error) throw new Error(`Failed to load Pokémon #${id}: ${error.message}`);
  return data;
});

export type PokemonDetail = NonNullable<
  Awaited<ReturnType<typeof getPokemonDetail>>
>;
