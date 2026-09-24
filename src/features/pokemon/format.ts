import type { Locale } from "next-intl";

/** "#025" */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

type LocalizedNames = { name_ko: string; name_en: string; name_ja: string };

export function localizedName(pokemon: LocalizedNames, locale: Locale): string {
  return pokemon[`name_${locale}`];
}
