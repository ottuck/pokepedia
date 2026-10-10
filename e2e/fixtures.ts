import { test as base } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadLocalSupabaseTestEnv } from "../scripts/testing/local-supabase";

loadLocalSupabaseTestEnv();

type Players = {
  trackCurrent(): Promise<string>;
  activeAnswer(): Promise<string>;
  activeRunId(): Promise<string>;
  createOtherRun(pokemonId: number): Promise<void>;
};

export const test = base.extend<{ players: Players }>({
  players: async ({ context }, runFixture) => {
    const userIds = new Set<string>();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const admin = createClient<Database>(
      url,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    // Read the browser's actual SSR cookies; do not infer its player from global DB rows.
    const session = createServerClient<Database>(url, key, {
      cookies: { getAll: () => context.cookies(), setAll: () => {} },
    });
    const trackCurrent = async () => {
      const { data, error } = await session.auth.getClaims();
      if (error) throw error;
      const userId = data?.claims.sub;
      if (!userId) throw new Error("The test browser has no player session.");
      userIds.add(userId);
      return userId;
    };

    try {
      await runFixture({
        trackCurrent,
        // RLS hides active rounds from players; only this test's admin reads its answer.
        async activeAnswer() {
          const userId = await trackCurrent();
          const { data, error } = await admin
            .from("quiz_round")
            .select("pokemon(name_ko)")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();
          if (error) throw error;
          return data.pokemon.name_ko;
        },
        async activeRunId() {
          const userId = await trackCurrent();
          const { data, error } = await admin
            .from("quiz_run")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();
          if (error) throw error;
          return data.id;
        },
        async createOtherRun(pokemonId) {
          const other = createClient<Database>(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await other.auth.signInAnonymously();
          if (error || !data.user)
            throw error ?? new Error("Guest creation failed.");
          userIds.add(data.user.id);
          const { error: startError } = await admin.rpc("quiz_start_run", {
            p_user_id: data.user.id,
            p_pokemon_id: pokemonId,
            p_hp: 3,
            p_skips: 3,
          });
          if (startError) throw startError;
        },
      });
    } finally {
      for (const userId of userIds) {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      }
    }
  },
});
