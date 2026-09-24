import { describe, expect, it } from "vitest";
import { adminClient, anonymousPlayer } from "./clients";

const PIKACHU = 25;
const RAICHU = 26;

async function startRun(userId: string, pokemonId = PIKACHU) {
  const { data, error } = await adminClient().rpc("quiz_start_run", {
    p_user_id: userId,
    p_pokemon_id: pokemonId,
    p_hp: 3,
    p_skips: 3,
  });
  if (error) throw error;
  return data[0];
}

const clearedRound = {
  status: "cleared",
  hp: 3,
  attempts: 1,
  hint_used: false,
  score_gained: 100,
};
const runAfterClear = {
  status: "active",
  end_reason: null,
  score: 100,
  combo: 1,
  best_combo: 1,
  rounds_cleared: 1,
  skips_left: 3,
};

async function clearRound(userId: string, roundId: string, version = 0) {
  return adminClient().rpc("quiz_commit", {
    p_user_id: userId,
    p_round_id: roundId,
    p_expected_version: version,
    p_round: clearedRound,
    p_run: runAfterClear,
    p_sticker_variant: "normal",
    p_next_pokemon_id: RAICHU,
    p_next_hp: 3,
  });
}

describe("quiz RPCs are server-only", () => {
  // Exact argument sets: PostgREST resolves functions by argument names.
  const calls = {
    quiz_start_run: {
      p_user_id: "",
      p_pokemon_id: PIKACHU,
      p_hp: 3,
      p_skips: 3,
    },
    quiz_commit: {
      p_user_id: "",
      p_round_id: crypto.randomUUID(),
      p_expected_version: 0,
      p_round: clearedRound,
      p_run: runAfterClear,
    },
    quiz_round_secret: { p_user_id: "", p_round_id: crypto.randomUUID() },
  };

  it.each(Object.keys(calls) as (keyof typeof calls)[])(
    "%s cannot be executed by a player",
    async (fn) => {
      const { client, userId } = await anonymousPlayer();
      const { error } = await client.rpc(fn, {
        ...calls[fn],
        p_user_id: userId,
      } as never);
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(
        new RegExp(`permission denied for function ${fn}`),
      );
    },
  );
});

describe("quiz_start_run", () => {
  it("creates a run with its first round, and only one active run per player", async () => {
    const { userId } = await anonymousPlayer();
    const { run_id, round_id } = await startRun(userId);

    const { data: round } = await adminClient()
      .from("quiz_round")
      .select("run_id, seq, hp, status, pokemon_id")
      .eq("id", round_id)
      .single();
    expect(round).toEqual({
      run_id,
      seq: 1,
      hp: 3,
      status: "active",
      pokemon_id: PIKACHU,
    });

    await expect(startRun(userId)).rejects.toMatchObject({ code: "23505" });
  });
});

describe("quiz_round_secret", () => {
  it("returns answer keys only for the round's owner", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();
    const { round_id } = await startRun(alice.userId);
    const admin = adminClient();

    const own = await admin.rpc("quiz_round_secret", {
      p_user_id: alice.userId,
      p_round_id: round_id,
    });
    expect(own.data?.[0]).toMatchObject({ pokemon_id: PIKACHU });
    expect(own.data?.[0].answer_keys).toContain("pikachu");

    const other = await admin.rpc("quiz_round_secret", {
      p_user_id: bob.userId,
      p_round_id: round_id,
    });
    expect(other.data).toEqual([]);
  });
});

describe("quiz_commit", () => {
  it("resolves the round, updates the run, adds a sticker and opens the next round", async () => {
    const { userId } = await anonymousPlayer();
    const { run_id, round_id } = await startRun(userId);

    const { data, error } = await clearRound(userId, round_id);
    expect(error).toBeNull();
    expect(data?.[0].sticker_quantity).toBe(1);

    const admin = adminClient();
    const { data: run } = await admin
      .from("quiz_run")
      .select("*")
      .eq("id", run_id)
      .single();
    expect(run).toMatchObject({
      score: 100,
      combo: 1,
      rounds_cleared: 1,
      status: "active",
    });

    const { data: rounds } = await admin
      .from("quiz_round")
      .select("seq, status, pokemon_id, sticker_variant, version")
      .eq("run_id", run_id)
      .order("seq");
    expect(rounds).toEqual([
      {
        seq: 1,
        status: "cleared",
        pokemon_id: PIKACHU,
        sticker_variant: "normal",
        version: 1,
      },
      {
        seq: 2,
        status: "active",
        pokemon_id: RAICHU,
        sticker_variant: null,
        version: 0,
      },
    ]);
  });

  it("counts duplicate stickers instead of adding rows", async () => {
    const { userId } = await anonymousPlayer();
    const first = await startRun(userId);
    await clearRound(userId, first.round_id);
    const { data: next } = await adminClient()
      .from("quiz_round")
      .select("id")
      .eq("run_id", first.run_id)
      .eq("status", "active")
      .single();

    // Second clear in the same run, of a different Pokémon but reusing the payload's variant.
    const { data } = await adminClient().rpc("quiz_commit", {
      p_user_id: userId,
      p_round_id: next!.id,
      p_expected_version: 0,
      p_round: clearedRound,
      p_run: {
        ...runAfterClear,
        score: 210,
        combo: 2,
        best_combo: 2,
        rounds_cleared: 2,
      },
      p_sticker_variant: "normal",
    });
    expect(data?.[0].sticker_quantity).toBe(1); // Raichu: first one

    const { data: stickers } = await adminClient()
      .from("user_sticker")
      .select("pokemon_id, variant, quantity")
      .eq("user_id", userId)
      .order("pokemon_id");
    expect(stickers).toEqual([
      { pokemon_id: PIKACHU, variant: "normal", quantity: 1 },
      { pokemon_id: RAICHU, variant: "normal", quantity: 1 },
    ]);
  });

  it("applies a double-submitted answer only once", async () => {
    const { userId } = await anonymousPlayer();
    const { round_id } = await startRun(userId);

    const [a, b] = await Promise.all([
      clearRound(userId, round_id),
      clearRound(userId, round_id),
    ]);
    const errors = [a.error, b.error].filter(Boolean);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("quiz_conflict");

    const { data: stickers } = await adminClient()
      .from("user_sticker")
      .select("quantity")
      .eq("user_id", userId);
    expect(stickers).toEqual([{ quantity: 1 }]);
  });

  it("rejects a stale version and another player's round", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();
    const { round_id } = await startRun(alice.userId);

    const stale = await clearRound(alice.userId, round_id, 5);
    const stolen = await clearRound(bob.userId, round_id);
    expect(stale.error?.message).toBe("quiz_conflict");
    expect(stolen.error?.message).toBe("quiz_conflict");
  });
});

describe("player access", () => {
  it("hides the round in play, but shows finished rounds, runs and stickers to their owner", async () => {
    const { client, userId } = await anonymousPlayer();
    const { run_id, round_id } = await startRun(userId);

    const before = await client
      .from("quiz_round")
      .select("id")
      .eq("run_id", run_id);
    expect(before.data).toEqual([]); // the active round's pokemon_id is the answer

    await clearRound(userId, round_id);

    const rounds = await client
      .from("quiz_round")
      .select("id, pokemon_id")
      .eq("run_id", run_id);
    expect(rounds.data).toEqual([{ id: round_id, pokemon_id: PIKACHU }]); // round 2 still hidden
    const runs = await client.from("quiz_run").select("id");
    expect(runs.data).toEqual([{ id: run_id }]);
    const stickers = await client.from("user_sticker").select("pokemon_id");
    expect(stickers.data).toEqual([{ pokemon_id: PIKACHU }]);
  });

  it("shows nothing of another player's game", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();
    const { round_id } = await startRun(alice.userId);
    await clearRound(alice.userId, round_id);

    for (const table of ["quiz_run", "quiz_round", "user_sticker"] as const) {
      const { data } = await bob.client
        .from(table)
        .select("user_id")
        .eq("user_id", alice.userId);
      expect(data).toEqual([]);
    }
  });

  it("cannot write game tables directly", async () => {
    const { client, userId } = await anonymousPlayer();
    const { run_id } = await startRun(userId);

    const cheat = await client
      .from("quiz_run")
      .update({ score: 999_999 })
      .eq("id", run_id);
    const forge = await client.from("user_sticker").insert({
      user_id: userId,
      pokemon_id: 150,
      variant: "shiny",
      quantity: 99,
    });

    expect(cheat.error?.code).toBe("42501");
    expect(forge.error?.code).toBe("42501");
  });
});
