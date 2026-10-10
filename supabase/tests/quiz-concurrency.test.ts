import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { createSupabaseQuizRepository } from "../../src/features/quiz/repository.supabase";
import { createQuizService } from "../../src/features/quiz/service";
import type { Database } from "../../src/lib/supabase/database.types";
import { adminClient, anonymousPlayer } from "./clients";

const urls = {
  artwork: (path: string) => path,
  silhouette: (path: string) => path,
};

it("keeps earned points when another tab clears during flee's state read", async () => {
  const { userId } = await anonymousPlayer();
  const admin = adminClient();
  const normal = createQuizService({
    repo: createSupabaseQuizRepository(admin),
    random: () => 0.99,
    urls,
  });
  try {
    const start = await normal.startOrResume(userId, "ko");
    if (!start.ok) throw new Error(start.code);
    const { data: secrets, error } = await admin.rpc("quiz_round_secret", {
      p_user_id: userId,
      p_round_id: start.data.round.id,
    });
    if (error) throw error;
    let armed = true;
    const paused = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (input, init) => {
            const response = await fetch(input, init);
            const url = new URL(
              input instanceof Request ? input.url : String(input),
            );
            if (armed && url.pathname === "/rest/v1/quiz_run") {
              armed = false;
              // The old response is already complete; another tab commits before flee
              // consumes it. Separate run/round queries used to lose these points.
              await response.clone().text();
              expect(
                await normal.answer(
                  userId,
                  start.data.round.id,
                  secrets[0].answer_keys[0],
                  "ko",
                ),
              ).toMatchObject({
                ok: true,
                data: {
                  outcome: "cleared",
                  run: { score: 100, roundsCleared: 1 },
                },
              });
            }
            return response;
          },
        },
      },
    );
    const flee = createQuizService({
      repo: createSupabaseQuizRepository(paused),
      random: () => 0.99,
      urls,
    });
    expect(await flee.flee(userId, "ko")).toEqual({
      ok: false,
      code: "conflict",
    });
    expect(await normal.flee(userId, "ko")).toMatchObject({
      ok: true,
      data: { run: { score: 100, roundsCleared: 1, status: "finished" } },
    });
    const { data: run, error: readError } = await admin
      .from("quiz_run")
      .select("score, rounds_cleared, status")
      .eq("id", start.data.run.id)
      .single();
    expect(readError).toBeNull();
    expect(run).toEqual({ score: 100, rounds_cleared: 1, status: "finished" });
  } finally {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
});
