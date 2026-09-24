export type OwnedSticker = {
  pokemon_id: number;
  variant: "normal" | "shiny";
  quantity: number;
};

/** How many of each variant the player owns for one Pokémon. */
export type Holding = { normal: number; shiny: number };

export type CollectionSummary = {
  byPokemon: ReadonlyMap<number, Holding>;
  /** Distinct Pokémon with at least one sticker of any variant. */
  collected: number;
  /** Distinct Pokémon with at least one shiny sticker. */
  shinyCollected: number;
  /** Every sticker, duplicates included. */
  totalStickers: number;
};

export function summarizeCollection(
  stickers: readonly OwnedSticker[],
): CollectionSummary {
  const byPokemon = new Map<number, Holding>();
  let totalStickers = 0;
  for (const { pokemon_id, variant, quantity } of stickers) {
    const holding = byPokemon.get(pokemon_id) ?? { normal: 0, shiny: 0 };
    holding[variant] += quantity;
    byPokemon.set(pokemon_id, holding);
    totalStickers += quantity;
  }
  const holdings = [...byPokemon.values()];
  return {
    byPokemon,
    collected: holdings.length,
    shinyCollected: holdings.filter((h) => h.shiny > 0).length,
    totalStickers,
  };
}

export const COLLECTION_FILTERS = [
  "all",
  "collected",
  "missing",
  "shiny",
] as const;
export type CollectionFilter = (typeof COLLECTION_FILTERS)[number];

export function matchesFilter(
  holding: Holding | undefined,
  filter: CollectionFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "collected":
      return holding !== undefined;
    case "missing":
      return holding === undefined;
    case "shiny":
      return (holding?.shiny ?? 0) > 0;
  }
}
