import type { CSSProperties } from "react";
import type { Database } from "@/lib/supabase/database.types";

export type PokemonType = Database["public"]["Enums"]["pokemon_type"];

type TypeColors = {
  /** The type's signature color: borders, glows, accents. */
  base: string;
  /** Light tint for backgrounds. */
  soft: string;
  /** Text on `soft` (≥ 5:1 contrast, checked in types.test.ts). */
  ink: string;
};

// Base colors are the commonly used game palette; soft/ink were derived from them
// (82% white mix / darkened until contrast ≥ 5:1) and are fixed here so they can be tested.
export const TYPE_COLORS = {
  normal: { base: "#A8A77A", soft: "#EFEFE7", ink: "#656449" },
  fire: { base: "#EE8130", soft: "#FCE8DA", ink: "#94501E" },
  water: { base: "#6390F0", soft: "#E3EBFC", ink: "#415F9E" },
  electric: { base: "#F7D02C", soft: "#FEF7D9", ink: "#7B6816" },
  grass: { base: "#7AC74C", soft: "#E7F5DF", ink: "#446F2B" },
  ice: { base: "#96D9D6", soft: "#ECF8F8", ink: "#4B6C6B" },
  fighting: { base: "#C22E28", soft: "#F4D9D8", ink: "#88201C" },
  poison: { base: "#A33EA1", soft: "#EEDCEE", ink: "#722B71" },
  ground: { base: "#E2BF65", soft: "#FAF3E3", ink: "#766335" },
  flying: { base: "#A98FF3", soft: "#F0EBFD", ink: "#695997" },
  psychic: { base: "#F95587", soft: "#FEE0E9", ink: "#A43859" },
  bug: { base: "#A6B91A", soft: "#EFF2D6", ink: "#606B0F" },
  rock: { base: "#B6A136", soft: "#F2EEDB", ink: "#716421" },
  ghost: { base: "#735797", soft: "#E6E1EC", ink: "#513D6A" },
  dragon: { base: "#6F35FC", soft: "#E5DBFE", ink: "#4E25B0" },
  dark: { base: "#705746", soft: "#E5E1DE", ink: "#4E3D31" },
  steel: { base: "#B7B7CE", soft: "#F2F2F6", ink: "#666673" },
  fairy: { base: "#D685AD", soft: "#F8E9F0", ink: "#85526B" },
} as const satisfies Record<PokemonType, TypeColors>;

/**
 * CSS custom properties for a Pokémon's typing, consumed by Tailwind arbitrary values such as
 * `bg-(--type-soft)`. The second type (or the first again) feeds dual-type gradients.
 */
export function typeStyle(
  type1: PokemonType,
  type2: PokemonType | null,
): CSSProperties {
  const primary = TYPE_COLORS[type1];
  const secondary = TYPE_COLORS[type2 ?? type1];
  return {
    "--type": primary.base,
    "--type-soft": primary.soft,
    "--type-ink": primary.ink,
    "--type-2": secondary.base,
  } as CSSProperties;
}
