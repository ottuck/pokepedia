import { describe, expect, it } from "vitest";
import { createSupabaseQuizRepository } from "../../src/features/quiz/repository.supabase";
import { createQuizService } from "../../src/features/quiz/service";
import { adminClient, anonymousPlayer } from "./clients";

// The quiz service over the real Supabase repository: checks the SQL, the query shapes and
// the RPC wiring together. Requires the synced catalog (`pnpm sync:pokemon`).

const urls = { artwork: (p: string) => p, silhouette: (p: string) => p };
const NOT_SHINY = () => 0.99;

function service(random = NOT_SHINY) {
  return createQuizService({
    repo: createSupabaseQuizRepository(adminClient()),
    random,
    urls,
  });
}

async function answerKey(userId: string, roundId: string) {
  const { data } = await adminClient().rpc("quiz_round_secret", {
    p_user_id: userId,
    p_round_id: roundId,
  });
  return data![0].answer_keys[0];
}

async function start(userId: string) {
  const result = await service().startOrResume(userId, "ko");
  if (!result.ok) throw new Error(result.code);
  return result.data;
}

describe("quiz service on Supabase", () => {
  it("plays a round end to end: miss, clear, sticker, next round", async () => {
    const { client, userId } = await anonymousPlayer();
    const { round } = await start(userId);
    expect(round.silhouetteUrl).toMatch(/^[0-9a-f]{16}\.webp$/);

    const miss = await service().answer(
      userId,
      round.id,
      "절대 포켓몬 이름 아님",
      "ko",
    );
    expect(miss).toMatchObject({
      ok: true,
      data: { outcome: "wrong", round: { hp: 2 } },
    });

    const clear = await service().answer(
      userId,
      round.id,
      await answerKey(userId, round.id),
      "ko",
    );
    if (!clear.ok || clear.data.outcome !== "cleared")
      throw new Error("expected clear");
    expect(clear.data).toMatchObject({
      scoreGained: 60,
      sticker: { variant: "normal", quantity: 1, isNew: true },
      nextRound: { seq: 2, hp: 3 },
    });

    // The player sees their sticker and the finished round through RLS.
    const { data: stickers } = await client
      .from("user_sticker")
      .select("pokemon_id");
    expect(stickers).toEqual([{ pokemon_id: clear.data.revealed.id }]);
  });

  it("resumes the same run after a reload", async () => {
    const { userId } = await anonymousPlayer();
    const first = await start(userId);
    const again = await start(userId);
    expect(again.round.id).toBe(first.round.id);
  });

  it("applies one of two simultaneous answers and reports a conflict for the other", async () => {
    const { userId } = await anonymousPlayer();
    const { round } = await start(userId);
    const key = await answerKey(userId, round.id);

    const results = await Promise.all([
      service().answer(userId, round.id, key, "ko"),
      service().answer(userId, round.id, key, "ko"),
    ]);

    const codes = results.map((r) => (r.ok ? "ok" : r.code)).sort();
    expect(codes).toEqual(["conflict", "ok"]);
    const { data: stickers } = await adminClient()
      .from("user_sticker")
      .select("quantity")
      .eq("user_id", userId);
    expect(stickers).toEqual([{ quantity: 1 }]);
  });

  it("hints, skips and flees through the RPCs", async () => {
    const { userId } = await anonymousPlayer();
    const { round } = await start(userId);

    const hinted = await service().hint(userId, round.id, "en");
    expect(hinted).toMatchObject({
      ok: true,
      data: { round: { hintUsed: true } },
    });

    const skipped = await service().skip(userId, round.id, "en");
    if (!skipped.ok) throw new Error(skipped.code);
    expect(skipped.data.run.skipsLeft).toBe(2);

    const fled = await service().flee(userId, "en");
    expect(fled).toMatchObject({
      ok: true,
      data: { run: { status: "finished" } },
    });

    const { data: run } = await adminClient()
      .from("quiz_run")
      .select("status, end_reason")
      .eq("user_id", userId)
      .single();
    expect(run).toEqual({ status: "finished", end_reason: "fled" });
  });

  it("will not touch another player's round", async () => {
    const alice = await anonymousPlayer();
    const bob = await anonymousPlayer();
    const { round } = await start(alice.userId);

    expect(
      await service().answer(bob.userId, round.id, "피카츄", "ko"),
    ).toEqual({
      ok: false,
      code: "not_found",
    });
  });
});
