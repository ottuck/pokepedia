/**
 * Syncs Gen 1 Pokémon (#001–151) from PokeAPI into Supabase: catalog rows, artwork,
 * shiny artwork and quiz silhouettes. Idempotent; safe to re-run.
 *
 *   pnpm sync:pokemon                                   # local Supabase (.env.local)
 *   pnpm sync:pokemon --env-file .env.remote.local --yes   # remote, only when asked to
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { z } from "zod";
import type { Database } from "../../src/lib/supabase/database.types";
import { downloadArtwork, toArtworkWebp, toSilhouetteWebp } from "./images";
import {
  abilitySchema,
  apiPath,
  evolutionChainSchema,
  fetchResource,
  itemSchema,
  mapWithConcurrency,
  pokemonSchema,
  speciesSchema,
  type Item,
} from "./pokeapi";
import {
  artworkPath,
  FIRST_ID,
  findEvolutionSource,
  LAST_ID,
  shinyArtworkPath,
  silhouettePath,
  toAbilityRow,
  toPokemonAbilityRows,
  toPokemonRow,
  toQuizRow,
} from "./transform";

const CONCURRENCY = 5;
const ARTWORK_BUCKET = "pokemon-artwork";
const SILHOUETTE_BUCKET = "quiz-silhouette";
const ONE_YEAR = "31536000";

const { values: args } = parseArgs({
  options: {
    "env-file": { type: "string", default: ".env.local" },
    yes: { type: "boolean", default: false },
  },
});

process.loadEnvFile(args["env-file"]);

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
    SILHOUETTE_SECRET: z.string().min(32, "use at least 32 random characters"),
  })
  .parse(process.env);

const target = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const isLocal = ["127.0.0.1", "localhost"].includes(target.hostname);
console.log(
  `Target: ${target.origin} (${isLocal ? "local" : "REMOTE"}) via ${args["env-file"]}`,
);
if (!isLocal && !args.yes) {
  console.error("Refusing to write to a remote project without --yes.");
  process.exit(1);
}

const supabase = createClient<Database>(
  target.origin,
  env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const ids = Array.from(
  { length: LAST_ID - FIRST_ID + 1 },
  (_, i) => FIRST_ID + i,
);

console.log("Fetching species and Pokémon…");
const entries = await mapWithConcurrency(ids, CONCURRENCY, async (id) => ({
  species: await fetchResource(`pokemon-species/${id}`, speciesSchema),
  pokemon: await fetchResource(`pokemon/${id}`, pokemonSchema),
}));
const idBySpeciesName = new Map(
  entries.map(({ species }) => [species.name, species.id]),
);

console.log("Fetching evolution chains…");
const chainPaths = [
  ...new Set(
    entries.map(({ species }) => apiPath(species.evolution_chain.url)),
  ),
];
const chains = new Map(
  await mapWithConcurrency(chainPaths, CONCURRENCY, async (chainPath) => {
    const chain = await fetchResource(chainPath, evolutionChainSchema);
    return [chainPath, chain] as const;
  }),
);
const chainFor = (url: string) => chains.get(apiPath(url))!;

console.log("Fetching evolution items and abilities…");
const itemSlugs = new Set<string>();
for (const { species } of entries) {
  const source = findEvolutionSource(
    chainFor(species.evolution_chain.url),
    species.name,
  );
  if (source?.detail.item) itemSlugs.add(source.detail.item.name);
}
const itemsBySlug = new Map<string, Item>(
  await mapWithConcurrency([...itemSlugs], CONCURRENCY, async (slug) => {
    return [slug, await fetchResource(`item/${slug}`, itemSchema)] as const;
  }),
);

const abilityPaths = [
  ...new Set(
    entries.flatMap(({ pokemon }) =>
      pokemon.abilities.map((a) => apiPath(a.ability.url)),
    ),
  ),
];
const abilities = await mapWithConcurrency(
  abilityPaths,
  CONCURRENCY,
  (abilityPath) => fetchResource(abilityPath, abilitySchema),
);

console.log("Building rows…");
const pokemonRows = entries.map(({ species, pokemon }) =>
  toPokemonRow({
    species,
    pokemon,
    chain: chainFor(species.evolution_chain.url),
    idBySpeciesName,
    itemsBySlug,
  }),
);
const abilityRows = abilities.map(toAbilityRow);
const pokemonAbilityRows = entries.flatMap(({ pokemon }) =>
  toPokemonAbilityRows(pokemon),
);
const quizRows = entries.map(({ species }) =>
  toQuizRow(species, env.SILHOUETTE_SECRET),
);

console.log("Processing and uploading images…");
async function upload(bucket: string, objectPath: string, body: Buffer) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, body, {
      contentType: "image/webp",
      cacheControl: ONE_YEAR,
      upsert: true,
    });
  if (error)
    throw new Error(`Upload ${bucket}/${objectPath} failed: ${error.message}`);
}

let done = 0;
await mapWithConcurrency(entries, CONCURRENCY, async ({ pokemon }) => {
  const artwork = pokemon.sprites.other["official-artwork"];
  const [normalPng, shinyPng] = await Promise.all([
    downloadArtwork(artwork.front_default, `${pokemon.id}.png`),
    downloadArtwork(artwork.front_shiny, `${pokemon.id}-shiny.png`),
  ]);
  const [normal, shiny, silhouette] = await Promise.all([
    toArtworkWebp(normalPng),
    toArtworkWebp(shinyPng),
    toSilhouetteWebp(normalPng),
  ]);
  await Promise.all([
    upload(ARTWORK_BUCKET, artworkPath(pokemon.id), normal),
    upload(ARTWORK_BUCKET, shinyArtworkPath(pokemon.id), shiny),
    upload(
      SILHOUETTE_BUCKET,
      silhouettePath(pokemon.id, env.SILHOUETTE_SECRET),
      silhouette,
    ),
  ]);
  done++;
  if (done % 25 === 0 || done === entries.length)
    console.log(`  ${done}/${entries.length}`);
});

// Rows last: the catalog never points at images that were not uploaded.
console.log("Writing catalog…");
const { error } = await supabase.rpc("sync_pokemon_catalog", {
  p_abilities: abilityRows,
  p_pokemon: pokemonRows,
  p_pokemon_abilities: pokemonAbilityRows,
  p_quiz: quizRows,
});
if (error) throw new Error(`sync_pokemon_catalog failed: ${error.message}`);

console.log(
  `Synced ${pokemonRows.length} Pokémon, ${abilityRows.length} abilities, ` +
    `${pokemonAbilityRows.length} ability slots, ${quizRows.length} silhouettes.`,
);
