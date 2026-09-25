import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { adminClient, anonymousPlayer, authenticatedClient } from "./clients";

const PIKACHU = 25;
const RAICHU = 26;

function newToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: createHash("sha256").update(token).digest("hex"),
  };
}

async function googleUser() {
  const client = await authenticatedClient();
  const { data } = await client.auth.getUser();
  return { client, userId: data.user!.id };
}

async function ticketFor(userId: string, ttlSeconds = 600) {
  const { hash } = newToken();
  const { error } = await adminClient().rpc("guest_merge_create_ticket", {
    p_from_user: userId,
    p_token_hash: hash,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw error;
  return hash;
}

function redeem(hash: string, toUser: string) {
  return adminClient().rpc("guest_merge_redeem", {
    p_token_hash: hash,
    p_to_user: toUser,
  });
}

async function giveSticker(
  userId: string,
  pokemonId: number,
  variant: "normal" | "shiny",
  quantity: number,
) {
  const { error } = await adminClient().from("user_sticker").insert({
    user_id: userId,
    pokemon_id: pokemonId,
    variant,
    quantity,
  });
  if (error) throw error;
}

async function finishedRun(userId: string, score: number) {
  const admin = adminClient();
  const { data: run, error } = await admin
    .from("quiz_run")
    .insert({
      user_id: userId,
      status: "finished",
      end_reason: "fled",
      finished_at: new Date().toISOString(),
      score,
      skips_left: 3,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: roundError } = await admin.from("quiz_round").insert({
    run_id: run.id,
    user_id: userId,
    seq: 1,
    pokemon_id: PIKACHU,
    status: "cleared",
    hp: 3,
    attempts: 1,
    score_gained: score,
    sticker_variant: "normal",
    resolved_at: new Date().toISOString(),
  });
  if (roundError) throw roundError;
  return run.id;
}

describe("guest merge RPCs are server-only", () => {
  it("cannot be executed by a player", async () => {
    const { client, userId } = await anonymousPlayer();

    const create = await client.rpc("guest_merge_create_ticket", {
      p_from_user: userId,
      p_token_hash: newToken().hash,
      p_ttl_seconds: 600,
    });
    const redeemed = await client.rpc("guest_merge_redeem", {
      p_token_hash: newToken().hash,
      p_to_user: userId,
    });

    for (const [fn, { error }] of [
      ["guest_merge_create_ticket", create],
      ["guest_merge_redeem", redeemed],
    ] as const) {
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(`permission denied for function ${fn}`);
    }
  });

  it("keeps tickets out of the Data API", async () => {
    const { client } = await anonymousPlayer();
    const { error } = await client
      .schema("private" as never)
      .from("guest_merge_ticket")
      .select("*");

    expect(error).not.toBeNull();
  });
});

describe("guest_merge_redeem", () => {
  it("moves runs, rounds and stickers to the Google account, adding up duplicates", async () => {
    const guest = await anonymousPlayer();
    const google = await googleUser();
    await giveSticker(guest.userId, PIKACHU, "normal", 2);
    await giveSticker(guest.userId, RAICHU, "shiny", 1);
    await giveSticker(google.userId, PIKACHU, "normal", 3);
    const runId = await finishedRun(guest.userId, 480);
    const hash = await ticketFor(guest.userId);

    const { data: from, error } = await redeem(hash, google.userId);

    expect(error).toBeNull();
    expect(from).toBe(guest.userId);
    const admin = adminClient();
    const { data: stickers } = await admin
      .from("user_sticker")
      .select("pokemon_id, variant, quantity")
      .eq("user_id", google.userId)
      .order("pokemon_id");
    expect(stickers).toEqual([
      { pokemon_id: PIKACHU, variant: "normal", quantity: 5 },
      { pokemon_id: RAICHU, variant: "shiny", quantity: 1 },
    ]);
    const { data: run } = await admin
      .from("quiz_run")
      .select("user_id")
      .eq("id", runId)
      .single();
    expect(run?.user_id).toBe(google.userId);
    const { count: guestRounds } = await admin
      .from("quiz_round")
      .select("id", { count: "exact", head: true })
      .eq("user_id", guest.userId);
    expect(guestRounds).toBe(0);
    const { count: guestStickers } = await admin
      .from("user_sticker")
      .select("pokemon_id", { count: "exact", head: true })
      .eq("user_id", guest.userId);
    expect(guestStickers).toBe(0);
  });

  it("ends a game the guest left open, even when the Google account has one too", async () => {
    const guest = await anonymousPlayer();
    const google = await googleUser();
    const admin = adminClient();
    for (const userId of [guest.userId, google.userId]) {
      const { error } = await admin.rpc("quiz_start_run", {
        p_user_id: userId,
        p_pokemon_id: PIKACHU,
        p_hp: 3,
        p_skips: 3,
      });
      if (error) throw error;
    }
    const hash = await ticketFor(guest.userId);

    const { error } = await redeem(hash, google.userId);

    expect(error).toBeNull();
    const { data: runs } = await admin
      .from("quiz_run")
      .select("status, end_reason")
      .eq("user_id", google.userId)
      .order("started_at");
    expect(runs).toEqual([
      { status: "finished", end_reason: "fled" },
      { status: "active", end_reason: null },
    ]);
  });

  it("works exactly once per ticket", async () => {
    const guest = await anonymousPlayer();
    const google = await googleUser();
    const hash = await ticketFor(guest.userId);

    expect((await redeem(hash, google.userId)).error).toBeNull();
    const again = await redeem(hash, google.userId);

    expect(again.error?.message).toBe("merge_ticket_invalid");
  });

  it("rejects unknown and expired tickets", async () => {
    const guest = await anonymousPlayer();
    const google = await googleUser();
    const expired = await ticketFor(guest.userId, -1);

    const unknown = await redeem(newToken().hash, google.userId);
    const late = await redeem(expired, google.userId);

    expect(unknown.error?.message).toBe("merge_ticket_invalid");
    expect(late.error?.message).toBe("merge_ticket_invalid");
  });

  it("refuses to merge a user into itself", async () => {
    const guest = await anonymousPlayer();
    const hash = await ticketFor(guest.userId);

    const { error } = await redeem(hash, guest.userId);

    expect(error?.message).toBe("merge_same_user");
  });

  it("replaces an earlier unused ticket of the same guest", async () => {
    const guest = await anonymousPlayer();
    const google = await googleUser();
    const first = await ticketFor(guest.userId);
    const second = await ticketFor(guest.userId);

    expect((await redeem(first, google.userId)).error?.message).toBe(
      "merge_ticket_invalid",
    );
    expect((await redeem(second, google.userId)).error).toBeNull();
  });
});
