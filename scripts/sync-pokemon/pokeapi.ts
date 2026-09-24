import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const API_ROOT = "https://pokeapi.co/api/v2/";
const CACHE_DIR = path.join(".cache", "pokeapi");
const MAX_ATTEMPTS = 3;

// ── Response schemas: only the fields the sync uses. Unknown fields are stripped. ──

const namedResource = z.object({ name: z.string(), url: z.url() });
const language = z.object({ name: z.string() });
const localizedName = z.object({ name: z.string(), language });

export const speciesSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  names: z.array(localizedName),
  genera: z.array(z.object({ genus: z.string(), language })),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language,
      version: z.object({ name: z.string() }),
    }),
  ),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  evolves_from_species: namedResource.nullable(),
  evolution_chain: z.object({ url: z.url() }),
});

export const pokemonSchema = z.object({
  id: z.number().int(),
  height: z.number().int().positive(),
  weight: z.number().int().positive(),
  types: z
    .array(z.object({ slot: z.number().int(), type: namedResource }))
    .min(1)
    .max(2),
  stats: z.array(
    z.object({
      base_stat: z.number().int(),
      stat: z.object({ name: z.string() }),
    }),
  ),
  abilities: z.array(
    z.object({
      ability: namedResource,
      is_hidden: z.boolean(),
      slot: z.number().int(),
    }),
  ),
  sprites: z.object({
    other: z.object({
      "official-artwork": z.object({
        front_default: z.url(),
        front_shiny: z.url(),
      }),
    }),
  }),
});

export const evolutionDetailSchema = z.object({
  trigger: z.object({ name: z.string() }),
  min_level: z.number().int().nullable(),
  item: z.object({ name: z.string() }).nullable(),
  is_default: z.boolean().optional(),
});

export type ChainLink = {
  species: { name: string };
  evolution_details: z.infer<typeof evolutionDetailSchema>[];
  evolves_to: ChainLink[];
};

const chainLinkSchema: z.ZodType<ChainLink> = z.lazy(() =>
  z.object({
    species: z.object({ name: z.string() }),
    evolution_details: z.array(evolutionDetailSchema),
    evolves_to: z.array(chainLinkSchema),
  }),
);

export const evolutionChainSchema = z.object({
  id: z.number().int(),
  chain: chainLinkSchema,
});

export const abilitySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  names: z.array(localizedName),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language,
      version_group: z.object({ name: z.string() }),
    }),
  ),
});

export const itemSchema = z.object({
  name: z.string(),
  names: z.array(localizedName),
});

export type Species = z.infer<typeof speciesSchema>;
export type Pokemon = z.infer<typeof pokemonSchema>;
export type EvolutionChain = z.infer<typeof evolutionChainSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type Item = z.infer<typeof itemSchema>;

// ── Fetching ──

/** Relative API path for a full PokeAPI URL, e.g. "pokemon-species/25". */
export function apiPath(url: string): string {
  return url.replace(API_ROOT, "").replace(/\/$/, "");
}

/**
 * GETs a PokeAPI resource, validating it with `schema`. Raw responses are cached under
 * .cache/pokeapi so re-running the sync does not hit PokeAPI again (fair-use policy).
 */
export async function fetchResource<T>(
  resource: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const cacheFile = path.join(
    CACHE_DIR,
    `${resource.replaceAll("/", "_")}.json`,
  );

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {
    raw = await fetchJsonWithRetry(`${API_ROOT}${resource}/`);
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cacheFile, JSON.stringify(raw));
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Unexpected PokeAPI response for ${resource}: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS)
        throw new Error(`GET ${url} failed: ${String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

/** Like Promise.all over `items`, but with at most `limit` tasks in flight. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
