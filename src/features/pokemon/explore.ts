import type { Locale } from "next-intl";
import { z } from "zod";
import { normalizeAnswer } from "@/features/quiz/normalize";
import { Constants } from "@/lib/supabase/database.types";
import { localizedName } from "./format";
import type { PokemonType } from "./types";

export type DexEntry = {
  id: number;
  name_ko: string;
  name_en: string;
  name_ja: string;
  type_1: PokemonType;
  type_2: PokemonType | null;
};

export const SORT_OPTIONS = ["number", "name"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export type DexFilters = {
  query: string;
  type: PokemonType | null;
  sort: SortOption;
};

export const DEFAULT_FILTERS: DexFilters = {
  query: "",
  type: null,
  sort: "number",
};

// URL params come from users (shared links, hand edits): anything invalid falls back to the
// default instead of breaking the page.
const paramsSchema = z.object({
  q: z.string().max(40).catch(""),
  type: z.enum(Constants.public.Enums.pokemon_type).nullable().catch(null),
  sort: z.enum(SORT_OPTIONS).catch("number"),
});

export function parseDexParams(params: URLSearchParams): DexFilters {
  const parsed = paramsSchema.parse({
    q: params.get("q") ?? "",
    type: params.get("type"),
    sort: params.get("sort") ?? "number",
  });
  return { query: parsed.q, type: parsed.type, sort: parsed.sort };
}

/** Search params for the filters, omitting defaults so the plain URL stays clean. */
export function toDexParams(filters: DexFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params;
}

export type SearchIndex = ReadonlyMap<number, readonly string[]>;

/** Normalized names in every language, built once so each keystroke is a cheap scan. */
export function buildSearchIndex(entries: readonly DexEntry[]): SearchIndex {
  return new Map(
    entries.map((e) => [
      e.id,
      [e.name_ko, e.name_en, e.name_ja].map(normalizeAnswer),
    ]),
  );
}

function matchesQuery(
  entry: DexEntry,
  rawQuery: string,
  index: SearchIndex,
): boolean {
  const digits = rawQuery.replace(/^#/, "").trim();
  if (/^\d+$/.test(digits)) {
    // "25", "025" and "#025" all find Pikachu; "2" also finds 20–29, like a dex search box.
    const number = String(Number(digits));
    return String(entry.id).startsWith(number);
  }
  const query = normalizeAnswer(rawQuery);
  if (!query) return true;
  return index.get(entry.id)?.some((name) => name.includes(query)) ?? false;
}

export function filterDex(
  entries: readonly DexEntry[],
  filters: DexFilters,
  locale: Locale,
  index: SearchIndex,
): DexEntry[] {
  const result = entries.filter(
    (entry) =>
      (!filters.type ||
        entry.type_1 === filters.type ||
        entry.type_2 === filters.type) &&
      matchesQuery(entry, filters.query, index),
  );

  if (filters.sort === "name") {
    const collator = new Intl.Collator(locale);
    result.sort((a, b) =>
      collator.compare(localizedName(a, locale), localizedName(b, locale)),
    );
  } else {
    result.sort((a, b) => a.id - b.id);
  }
  return result;
}

/** Types that at least one entry has, in the enum's canonical order. */
export function presentTypes(entries: readonly DexEntry[]): PokemonType[] {
  const present = new Set(
    entries.flatMap((e) => (e.type_2 ? [e.type_1, e.type_2] : [e.type_1])),
  );
  return Constants.public.Enums.pokemon_type.filter((type) =>
    present.has(type),
  );
}
