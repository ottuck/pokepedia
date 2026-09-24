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
  /** Dark-theme `soft`: the base color mixed 28% into the dark card color. */
  softDark: string;
  /** Dark-theme `ink`: the base lightened until it reads on `softDark` and the card. */
  inkDark: string;
};

// Base colors are the commonly used game palette; soft/ink were derived from them
// (82% white mix / darkened until contrast ≥ 5:1) and are fixed here so they can be tested.
export const TYPE_COLORS = {
  normal: {
    base: "#A8A77A",
    soft: "#EFEFE7",
    ink: "#656449",
    softDark: "#45443C",
    inkDark: "#D4D3BD",
  },
  fire: {
    base: "#EE8130",
    soft: "#FCE8DA",
    ink: "#94501E",
    softDark: "#593A27",
    inkDark: "#F7C098",
  },
  water: {
    base: "#6390F0",
    soft: "#E3EBFC",
    ink: "#415F9E",
    softDark: "#323E5D",
    inkDark: "#B1C8F8",
  },
  electric: {
    base: "#F7D02C",
    soft: "#FEF7D9",
    ink: "#7B6816",
    softDark: "#5B5026",
    inkDark: "#FBE896",
  },
  grass: {
    base: "#7AC74C",
    soft: "#E7F5DF",
    ink: "#446F2B",
    softDark: "#384D2F",
    inkDark: "#BDE3A6",
  },
  ice: {
    base: "#96D9D6",
    soft: "#ECF8F8",
    ink: "#4B6C6B",
    softDark: "#405256",
    inkDark: "#CBECEB",
  },
  fighting: {
    base: "#C22E28",
    soft: "#F4D9D8",
    ink: "#88201C",
    softDark: "#4D2225",
    inkDark: "#E19794",
  },
  poison: {
    base: "#A33EA1",
    soft: "#EEDCEE",
    ink: "#722B71",
    softDark: "#442747",
    inkDark: "#D19FD0",
  },
  ground: {
    base: "#E2BF65",
    soft: "#FAF3E3",
    ink: "#766335",
    softDark: "#564B36",
    inkDark: "#F1DFB2",
  },
  flying: {
    base: "#A98FF3",
    soft: "#F0EBFD",
    ink: "#695997",
    softDark: "#463E5E",
    inkDark: "#D4C7F9",
  },
  psychic: {
    base: "#F95587",
    soft: "#FEE0E9",
    ink: "#A43859",
    softDark: "#5C2D40",
    inkDark: "#FCAAC3",
  },
  bug: {
    base: "#A6B91A",
    soft: "#EFF2D6",
    ink: "#606B0F",
    softDark: "#454921",
    inkDark: "#D3DC8D",
  },
  rock: {
    base: "#B6A136",
    soft: "#F2EEDB",
    ink: "#716421",
    softDark: "#494329",
    inkDark: "#DBD09B",
  },
  ghost: {
    base: "#735797",
    soft: "#E6E1EC",
    ink: "#513D6A",
    softDark: "#372E44",
    inkDark: "#B9ABCB",
  },
  dragon: {
    base: "#6F35FC",
    soft: "#E5DBFE",
    ink: "#4E25B0",
    softDark: "#352460",
    inkDark: "#B79AFE",
  },
  dark: {
    base: "#705746",
    soft: "#E5E1DE",
    ink: "#4E3D31",
    softDark: "#362E2E",
    inkDark: "#B8ABA3",
  },
  steel: {
    base: "#B7B7CE",
    soft: "#F2F2F6",
    ink: "#666673",
    softDark: "#4A4954",
    inkDark: "#DBDBE7",
  },
  fairy: {
    base: "#D685AD",
    soft: "#F8E9F0",
    ink: "#85526B",
    softDark: "#523B4A",
    inkDark: "#EBC2D6",
  },
} as const satisfies Record<PokemonType, TypeColors>;

/**
 * CSS custom properties for a Pokémon's typing, consumed by Tailwind arbitrary values such as
 * `bg-(--type-soft)`. The second type (or the first again) feeds dual-type gradients.
 * `light-dark()` picks the tint for the element's color scheme, so pages stay theme-agnostic.
 */
export function typeStyle(
  type1: PokemonType,
  type2: PokemonType | null,
): CSSProperties {
  const primary = TYPE_COLORS[type1];
  const secondary = TYPE_COLORS[type2 ?? type1];
  return {
    "--type": primary.base,
    "--type-soft": `light-dark(${primary.soft}, ${primary.softDark})`,
    "--type-ink": `light-dark(${primary.ink}, ${primary.inkDark})`,
    "--type-2": secondary.base,
  } as CSSProperties;
}
