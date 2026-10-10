import { describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  anonymousPlayer,
  authenticatedClient,
} from "./clients";

const PIKACHU = 25;

// A future cutoff makes brand-new fixtures inactive. Every cleanup call names its fixtures
// explicitly, so other local accounts are never deletion candidates.
const future = () => new Date(Date.now() + 60_000).toISOString();

function cleanup(userIds: string[], inactiveBefore?: string, dryRun = false) {
  return adminClient().rpc("cleanup_inactive_guests", {
    p_user_ids: userIds,
    p_inactive_before: inactiveBefore,
    p_dry_run: dryRun,
  });
}

async function exists(userId: string) {
  const { data } = await adminClient().auth.admin.getUserById(userId);
  return data.user !== null;
}

async function giveSticker(userId: string) {
  const { error } = await adminClient().from("user_sticker").insert({
    user_id: userId,
    pokemon_id: PIKACHU,
    variant: "normal",
    quantity: 1,
  });
  if (error) throw error;
}

async function startGame(userId: string) {
  const { error } = await adminClient().rpc("quiz_start_run", {
    p_user_id: userId,
    p_pokemon_id: PIKACHU,
    p_hp: 3,
    p_skips: 3,
  });
  if (error) throw error;
}

async function finishedGame(userId: string) {
  const { error } = await adminClient().from("quiz_run").insert({
    user_id: userId,
    status: "finished",
    end_reason: "fled",
    finished_at: new Date().toISOString(),
    skips_left: 3,
  });
  if (error) throw error;
}

describe("cleanup_inactive_guests", () => {
  it("cannot be run by players", async () => {
    const { client, userId } = await anonymousPlayer();

    for (const caller of [anonClient(), client]) {
      for (const args of [
        { p_dry_run: true },
        { p_user_ids: [userId], p_dry_run: true },
      ]) {
        const { error } = await caller.rpc("cleanup_inactive_guests", args);
        expect(error?.code).toBe("42501");
      }
    }
  });

  it("only counts in a dry run", async () => {
    const guest = await anonymousPlayer();

    const { data, error } = await cleanup([guest.userId], future(), true);

    expect(error).toBeNull();
    expect(data).toBe(1);
    expect(await exists(guest.userId)).toBe(true);
  });

  it("deletes an inactive guest with no stickers, and everything it owned", async () => {
    const guest = await anonymousPlayer();
    await finishedGame(guest.userId);

    const { error } = await cleanup([guest.userId], future());

    expect(error).toBeNull();
    expect(await exists(guest.userId)).toBe(false);
    const admin = adminClient();
    const { count: profiles } = await admin
      .from("profile")
      .select("id", { count: "exact", head: true })
      .eq("id", guest.userId);
    const { count: runs } = await admin
      .from("quiz_run")
      .select("id", { count: "exact", head: true })
      .eq("user_id", guest.userId);
    expect(profiles).toBe(0);
    expect(runs).toBe(0);
  });

  it("keeps a guest that owns even one sticker, however long inactive", async () => {
    const guest = await anonymousPlayer();
    await giveSticker(guest.userId);

    await cleanup([guest.userId], future());

    expect(await exists(guest.userId)).toBe(true);
  });

  it("keeps a guest with a game in progress", async () => {
    const guest = await anonymousPlayer();
    await startGame(guest.userId);

    await cleanup([guest.userId], future());

    expect(await exists(guest.userId)).toBe(true);
  });

  it("keeps guests active within the window (the default 60 days)", async () => {
    const guest = await anonymousPlayer();

    const { error } = await cleanup([guest.userId]);

    expect(error).toBeNull();
    expect(await exists(guest.userId)).toBe(true);
  });

  it("never deletes a non-guest account", async () => {
    const client = await authenticatedClient();
    const { data } = await client.auth.getUser();

    await cleanup([data.user!.id], future());

    expect(await exists(data.user!.id)).toBe(true);
  });

  it("only deletes the named fixture, leaving another eligible guest untouched", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();

    const { data, error } = await cleanup([alice.userId], future());

    expect(error).toBeNull();
    expect(data).toBe(1);
    expect(await exists(alice.userId)).toBe(false);
    expect(await exists(bob.userId)).toBe(true);
  });

  it("an empty scope deletes no users", async () => {
    const guest = await anonymousPlayer();

    const { data, error } = await cleanup([], future());

    expect(error).toBeNull();
    expect(data).toBe(0);
    expect(await exists(guest.userId)).toBe(true);
  });

  it("keeps the existing unscoped RPC compatible without deleting fixtures", async () => {
    const { data, error } = await adminClient().rpc("cleanup_inactive_guests", {
      p_dry_run: true,
      p_limit: 0,
    });
    expect(error).toBeNull();
    expect(data).toBe(0);
  });
});
