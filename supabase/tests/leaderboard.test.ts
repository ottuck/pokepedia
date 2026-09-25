import { describe, expect, it } from "vitest";
import { adminClient, anonClient, anonymousPlayer } from "./clients";

// Other test files write games too, so these players use scores far above anything else and
// unique nicknames, and assertions only look at their own rows.
let base = 9_000_000;
const nextScore = () => (base += 1000);

async function player(nickname: string) {
  const guest = await anonymousPlayer();
  const { error } = await adminClient()
    .from("profile")
    .update({ nickname })
    .eq("id", guest.userId);
  if (error) throw error;
  return guest;
}

async function game(
  userId: string,
  score: number,
  { bestCombo = 1, status = "finished" as "finished" | "active" } = {},
) {
  const finished = status === "finished";
  const { error } = await adminClient()
    .from("quiz_run")
    .insert({
      user_id: userId,
      status,
      end_reason: finished ? "fainted" : null,
      finished_at: finished ? new Date().toISOString() : null,
      score,
      combo: 0,
      best_combo: bestCombo,
      skips_left: 3,
    });
  if (error) throw error;
}

const tag = () => `LB-${crypto.randomUUID().slice(0, 8)}`;

async function board() {
  const { data, error } = await anonClient().rpc("leaderboard", {
    p_limit: 100,
  });
  if (error) throw error;
  return data;
}

describe("leaderboard", () => {
  it("is public, and exposes only rank, nickname, score and best combo", async () => {
    const name = tag();
    const { userId } = await player(name);
    await game(userId, nextScore(), { bestCombo: 7 });

    const rows = await board();
    const mine = rows.find((row) => row.nickname === name);

    expect(mine).toBeDefined();
    expect(Object.keys(mine!).sort()).toEqual(
      ["best_combo", "nickname", "rank", "score"].sort(),
    );
    expect(JSON.stringify(rows)).not.toContain(userId);
  });

  it("lists each player once, with their best finished game", async () => {
    const name = tag();
    const { userId } = await player(name);
    const low = nextScore();
    const high = nextScore();
    await game(userId, low, { bestCombo: 9 });
    await game(userId, high, { bestCombo: 4 });
    // An unfinished game never counts, however high.
    await game(userId, nextScore() + 500_000, { status: "active" });

    const mine = (await board()).filter((row) => row.nickname === name);

    expect(mine).toEqual([
      expect.objectContaining({ score: high, best_combo: 4 }),
    ]);
  });

  it("ranks by score, ties sharing a rank", async () => {
    const [a, b, c] = [tag(), tag(), tag()];
    const top = nextScore() + 100_000;
    for (const [name, score] of [
      [a, top],
      [b, top],
      [c, top - 1],
    ] as const) {
      const { userId } = await player(name);
      await game(userId, score);
    }

    const rows = await board();
    const row = (name: string) => rows.find((r) => r.nickname === name)!;
    // Standard competition ranking: 1 + how many players scored strictly more. Computed from
    // the board itself, since earlier runs of this file may have left equal scores behind.
    const expected = (score: number) =>
      1 + rows.filter((r) => r.score > score).length;

    expect(row(a).rank).toBe(row(b).rank);
    expect(row(a).rank).toBe(expected(top));
    expect(row(c).rank).toBe(expected(top - 1));
    expect(row(c).rank).toBeGreaterThanOrEqual(row(a).rank + 2);
  });

  it("leaves out players without a scored game", async () => {
    const name = tag();
    const { userId } = await player(name);
    await game(userId, 0);

    expect((await board()).some((row) => row.nickname === name)).toBe(false);
  });

  it("does not open the underlying tables", async () => {
    const anon = anonClient();

    const runs = await anon.from("quiz_run").select("user_id, score");
    const profiles = await anon.from("profile").select("nickname");

    expect(runs.error?.code).toBe("42501");
    expect(profiles.error?.code).toBe("42501");
  });
});

describe("my_leaderboard_rank", () => {
  it("returns the signed-in player's own standing", async () => {
    const { client, userId } = await player(tag());
    const score = nextScore() + 200_000;
    await game(userId, score, { bestCombo: 3 });

    const { data, error } = await client.rpc("my_leaderboard_rank");

    expect(error).toBeNull();
    expect(data).toEqual([{ rank: 1, score, best_combo: 3 }]);
  });

  it("is empty before a first scored game", async () => {
    const { client } = await player(tag());

    const { data } = await client.rpc("my_leaderboard_rank");

    expect(data).toEqual([]);
  });

  it("needs a session", async () => {
    const { error } = await anonClient().rpc("my_leaderboard_rank");

    expect(error?.code).toBe("42501");
  });
});
