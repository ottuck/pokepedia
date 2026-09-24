"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nicknameSchema } from "./nickname";

export type RenameResult =
  | { ok: true; nickname: string }
  | { ok: false; code: "invalid_nickname" | "not_signed_in" | "server_error" };

/**
 * Renames the signed-in player. Runs with their own session: RLS and the column grant only
 * allow `profile.nickname` of their own row, so no secret key is involved.
 */
export async function renameMe(nickname: unknown): Promise<RenameResult> {
  const parsed = nicknameSchema.safeParse(nickname);
  if (!parsed.success) return { ok: false, code: "invalid_nickname" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { ok: false, code: "not_signed_in" };

  const { data: row, error } = await supabase
    .from("profile")
    .update({ nickname: parsed.data })
    .eq("id", userId)
    .select("nickname")
    .maybeSingle();
  if (error || !row) {
    console.error(
      "[profile] rename failed:",
      error?.message ?? "no profile row",
    );
    return { ok: false, code: "server_error" };
  }

  refresh();
  return { ok: true, nickname: row.nickname };
}
