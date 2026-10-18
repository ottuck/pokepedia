import { describe, expect, it } from "vitest";
import { adminClient, anonClient, anonymousPlayer } from "./clients";

describe("profile", () => {
  it("is created with a default nickname when an anonymous user signs up", async () => {
    const { client, userId } = await anonymousPlayer();

    const { data, error } = await client.from("profile").select("*").single();

    expect(error).toBeNull();
    expect(data?.id).toBe(userId);
    expect(data?.nickname).toMatch(/^Trainer-[0-9A-F]{4}$/);
  });

  it("gets a generated name and a Pokémon picture, readable in every language", async () => {
    const { client } = await anonymousPlayer();

    const { data, error } = await client
      .from("profile")
      .select(
        "nickname_adjective(name_ko, name_en, name_ja), avatar_pokemon:pokemon(name_ko, artwork_path)",
      )
      .single();

    expect(error).toBeNull();
    expect(data?.nickname_adjective).toEqual({
      name_ko: expect.any(String),
      name_en: expect.any(String),
      name_ja: expect.any(String),
    });
    expect(data?.avatar_pokemon?.artwork_path).toEqual(expect.any(String));
  });

  it("drops the generated name, but keeps the picture, once the owner picks a nickname", async () => {
    const { client, userId } = await anonymousPlayer();

    const { data } = await client
      .from("profile")
      .update({ nickname: "레드" })
      .eq("id", userId)
      .select("nickname_adjective_id, avatar_pokemon_id")
      .single();

    expect(data?.nickname_adjective_id).toBeNull();
    expect(data?.avatar_pokemon_id).toEqual(expect.any(Number));
  });

  it("is only visible to its owner", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();

    const { data } = await alice.client
      .from("profile")
      .select("id")
      .eq("id", bob.userId);
    expect(data).toEqual([]);
  });

  it("is not readable without a session", async () => {
    const { data, error } = await anonClient().from("profile").select("id");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("lets the owner rename themselves within 2–20 characters", async () => {
    const { client, userId } = await anonymousPlayer();

    const renamed = await client
      .from("profile")
      .update({ nickname: "레드" })
      .eq("id", userId)
      .select("nickname")
      .single();
    expect(renamed.data?.nickname).toBe("레드");

    const tooShort = await client
      .from("profile")
      .update({ nickname: " a " })
      .eq("id", userId);
    expect(tooShort.error?.code).toBe("23514"); // check_violation
  });

  it("cannot rename someone else", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();

    const { data } = await alice.client
      .from("profile")
      .update({ nickname: "hacked" })
      .eq("id", bob.userId)
      .select();
    expect(data).toEqual([]);

    const { data: bobProfile } = await adminClient()
      .from("profile")
      .select("nickname")
      .eq("id", bob.userId)
      .single();
    expect(bobProfile?.nickname).not.toBe("hacked");
  });

  it("does not let users write any column but nickname, or insert/delete rows", async () => {
    const { client, userId } = await anonymousPlayer();

    const moveDate = await client
      .from("profile")
      .update({ created_at: "2000-01-01T00:00:00Z" })
      .eq("id", userId);
    const pickName = await client
      .from("profile")
      .update({ nickname_adjective_id: 1, avatar_pokemon_id: 25 })
      .eq("id", userId);
    const insert = await client
      .from("profile")
      .insert({ id: crypto.randomUUID(), nickname: "ghost" });
    const remove = await client.from("profile").delete().eq("id", userId);

    for (const { error } of [moveDate, pickName, insert, remove]) {
      expect(error?.code).toBe("42501");
    }
  });

  it("is removed with its user", async () => {
    const { userId } = await anonymousPlayer();
    const admin = adminClient();

    await admin.auth.admin.deleteUser(userId);

    const { data } = await admin.from("profile").select("id").eq("id", userId);
    expect(data).toEqual([]);
  });
});
