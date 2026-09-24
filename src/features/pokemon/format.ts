import type { Locale } from "next-intl";
import { publicEnv } from "@/lib/env/public";

const ARTWORK_BUCKET = "pokemon-artwork";

/** Public Storage URL for an artwork path such as "normal/025.webp". */
export function artworkUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ARTWORK_BUCKET}/${path}`;
}

/** "#025" */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

type LocalizedNames = { name_ko: string; name_en: string; name_ja: string };

export function localizedName(pokemon: LocalizedNames, locale: Locale): string {
  return pokemon[`name_${locale}`];
}
