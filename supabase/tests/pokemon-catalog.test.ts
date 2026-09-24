import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/database.types";
import { adminClient, anonClient, authenticatedClient } from "./clients";

type PokemonRow = Database["public"]["Tables"]["pokemon"]["Row"];

const bulbasaur: PokemonRow = {
  id: 1,
  name_ko: "이상해씨",
  name_en: "Bulbasaur",
  name_ja: "フシギダネ",
  genus_ko: "씨앗포켓몬",
  genus_en: "Seed Pokémon",
  genus_ja: "たねポケモン",
  type_1: "grass",
  type_2: "poison",
  height_dm: 7,
  weight_hg: 69,
  hp: 45,
  attack: 49,
  defense: 49,
  special_attack: 65,
  special_defense: 65,
  speed: 45,
  description_ko: "desc",
  description_en: "desc",
  description_ja: "desc",
  evolves_from_id: null,
  evolution: null,
  artwork_path: "normal/001.webp",
  shiny_artwork_path: "shiny/001.webp",
  is_legendary: false,
  is_mythical: false,
};

// Listed before its pre-evolution on purpose: the self-referencing FK must not depend on order.
const ivysaur: PokemonRow = {
  ...bulbasaur,
  id: 2,
  name_ko: "이상해풀",
  name_en: "Ivysaur",
  name_ja: "フシギソウ",
  evolves_from_id: 1,
  evolution: { trigger: "level-up", minLevel: 16 },
  artwork_path: "normal/002.webp",
  shiny_artwork_path: "shiny/002.webp",
};

const payload = {
  p_abilities: [
    {
      id: 65,
      slug: "overgrow",
      name_ko: "심록",
      name_en: "Overgrow",
      name_ja: "しんりょく",
      description_ko: "d",
      description_en: "d",
      description_ja: "d",
    },
  ],
  p_pokemon: [ivysaur, bulbasaur],
  p_pokemon_abilities: [
    { pokemon_id: 1, ability_id: 65, slot: 1, is_hidden: false },
    { pokemon_id: 2, ability_id: 65, slot: 1, is_hidden: false },
  ],
  p_quiz: [
    {
      pokemon_id: 1,
      silhouette_path: "test-0001.webp",
      answer_keys: ["이상해씨", "bulbasaur"],
    },
    {
      pokemon_id: 2,
      silhouette_path: "test-0002.webp",
      answer_keys: ["이상해풀", "ivysaur"],
    },
  ],
};

beforeAll(async () => {
  const { error } = await adminClient().rpc("sync_pokemon_catalog", payload);
  expect(error).toBeNull();
});

describe("sync_pokemon_catalog", () => {
  it("is idempotent", async () => {
    const admin = adminClient();
    const { error } = await admin.rpc("sync_pokemon_catalog", payload);
    expect(error).toBeNull();

    const { data } = await admin
      .from("pokemon_ability")
      .select("*")
      .in("pokemon_id", [1, 2]);
    expect(data).toHaveLength(2);
  });

  it("rejects a Pokémon whose second type repeats the first", async () => {
    const { error } = await adminClient().rpc("sync_pokemon_catalog", {
      ...payload,
      p_pokemon: [{ ...bulbasaur, type_2: "grass" }],
    });
    expect(error?.code).toBe("23514"); // check_violation
  });

  it.each([
    ["anon", anonClient],
    ["authenticated", authenticatedClient],
  ] as const)("cannot be executed by %s", async (_, makeClient) => {
    const client = await makeClient();
    const { error } = await client.rpc("sync_pokemon_catalog", payload);
    // Must be refused at the EXECUTE grant, not only later by the table grants inside it.
    expect(error?.code).toBe("42501"); // insufficient_privilege
    expect(error?.message).toMatch(
      /permission denied for function sync_pokemon_catalog/,
    );
  });
});

describe.each([
  ["anon", anonClient],
  ["authenticated", authenticatedClient],
] as const)("catalog access as %s", (_, makeClient) => {
  it("can read Pokémon with their abilities", async () => {
    const client = await makeClient();
    const { data, error } = await client
      .from("pokemon")
      .select("id, name_ko, pokemon_ability(slot, ability(name_en))")
      .eq("id", 2)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      id: 2,
      name_ko: "이상해풀",
      pokemon_ability: [{ slot: 1, ability: { name_en: "Overgrow" } }],
    });
  });

  it("cannot insert, update, or delete catalog rows", async () => {
    const client = await makeClient();

    const insert = await client
      .from("pokemon")
      .insert({ ...bulbasaur, id: 151 });
    const update = await client
      .from("pokemon")
      .update({ name_en: "Hacked" })
      .eq("id", 1);
    const remove = await client.from("pokemon").delete().eq("id", 1);

    for (const { error } of [insert, update, remove]) {
      expect(error?.code).toBe("42501");
    }
    const { data } = await adminClient()
      .from("pokemon")
      .select("name_en")
      .eq("id", 1)
      .single();
    expect(data?.name_en).toBe("Bulbasaur");
  });

  it("cannot reach the private quiz schema", async () => {
    // Untyped on purpose: the generated types (correctly) know nothing about `private`.
    const client = (await makeClient()) as unknown as SupabaseClient;
    const { data, error } = await client
      .schema("private")
      .from("pokemon_quiz")
      .select("*");

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
