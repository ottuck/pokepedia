import { describe, expect, it } from "vitest";
import { anonClient, anonymousPlayer, authenticatedClient } from "./clients";

const webp = (bytes = 1024) =>
  new Blob([new Uint8Array(bytes)], { type: "image/webp" });
const upload = { contentType: "image/webp" };

async function googleUser() {
  const client = await authenticatedClient();
  const { data } = await client.auth.getUser();
  return { client, userId: data.user!.id };
}

const path = (userId: string) => `${userId}/${Date.now()}.webp`;

describe("avatars bucket", () => {
  it("lets a Google user upload into their own folder, and remove it", async () => {
    const { client, userId } = await googleUser();
    const file = path(userId);

    const up = await client.storage
      .from("avatars")
      .upload(file, webp(), upload);
    expect(up.error).toBeNull();

    const removed = await client.storage.from("avatars").remove([file]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
  });

  it("refuses another user's folder", async () => {
    const alice = await googleUser();
    const bob = await googleUser();

    const { error } = await alice.client.storage
      .from("avatars")
      .upload(path(bob.userId), webp(), upload);

    expect(error).not.toBeNull();
  });

  it("does not let another user delete your picture", async () => {
    const alice = await googleUser();
    const bob = await googleUser();
    const file = path(alice.userId);
    await alice.client.storage.from("avatars").upload(file, webp(), upload);

    const { data } = await bob.client.storage.from("avatars").remove([file]);

    expect(data).toEqual([]);
    const { data: still } = await alice.client.storage
      .from("avatars")
      .list(alice.userId);
    expect(still?.map((object) => object.name)).toContain(file.split("/")[1]);
  });

  it("refuses guests, even in their own folder", async () => {
    const { client, userId } = await anonymousPlayer();

    const { error } = await client.storage
      .from("avatars")
      .upload(path(userId), webp(), upload);

    expect(error).not.toBeNull();
  });

  it("refuses visitors without a session", async () => {
    const { error } = await anonClient()
      .storage.from("avatars")
      .upload(`${crypto.randomUUID()}/1.webp`, webp(), upload);

    expect(error).not.toBeNull();
  });

  it("enforces the 512 KiB limit and webp/jpeg only", async () => {
    const { client, userId } = await googleUser();

    const big = await client.storage
      .from("avatars")
      .upload(path(userId), webp(600 * 1024), upload);
    const png = await client.storage
      .from("avatars")
      .upload(
        `${userId}/${Date.now() + 1}.png`,
        new Blob([new Uint8Array(10)]),
        {
          contentType: "image/png",
        },
      );

    expect(big.error).not.toBeNull();
    expect(png.error).not.toBeNull();
  });
});

describe("profile.avatar_path", () => {
  it("accepts only a picture in the owner's own folder", async () => {
    const alice = await googleUser();
    const bob = await googleUser();

    const own = await alice.client
      .from("profile")
      .update({ avatar_path: path(alice.userId) })
      .eq("id", alice.userId);
    const foreign = await alice.client
      .from("profile")
      .update({ avatar_path: path(bob.userId) })
      .eq("id", alice.userId);
    const traversal = await alice.client
      .from("profile")
      .update({ avatar_path: `${alice.userId}/../${bob.userId}/1.webp` })
      .eq("id", alice.userId);

    expect(own.error).toBeNull();
    expect(foreign.error?.code).toBe("23514");
    expect(traversal.error?.code).toBe("23514");
  });

  it("still only lets owners change their own row", async () => {
    const alice = await googleUser();
    const bob = await googleUser();

    const { data } = await alice.client
      .from("profile")
      .update({ avatar_path: path(bob.userId) })
      .eq("id", bob.userId)
      .select();

    expect(data).toEqual([]);
  });
});
