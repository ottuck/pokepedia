import { describe, expect, it } from "vitest";
import { adminClient, anonClient } from "./clients";

/** A fresh anonymous session: the way every player starts. */
async function anonymousPlayer() {
  const client = anonClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("no user");
  return { client, userId: data.user.id };
}

describe("profile", () => {
  it("is created with a default nickname when an anonymous user signs up", async () => {
    const { client, userId } = await anonymousPlayer();

    const { data, error } = await client.from("profile").select("*").single();

    expect(error).toBeNull();
    expect(data?.id).toBe(userId);
    expect(data?.nickname).toMatch(/^Trainer-[0-9A-F]{4}$/);
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
    const insert = await client
      .from("profile")
      .insert({ id: crypto.randomUUID(), nickname: "ghost" });
    const remove = await client.from("profile").delete().eq("id", userId);

    for (const { error } of [moveDate, insert, remove]) {
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
