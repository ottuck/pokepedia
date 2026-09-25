"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, isOwnAvatarPath } from "./avatar";
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

export type AvatarResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_signed_in" | "google_only" | "invalid_path" | "server_error";
    };

/**
 * Points the player's profile at a picture they just uploaded (or clears it with null), then
 * removes the previous file. The browser uploads straight to Storage, where policies allow
 * only non-guest users and only their own folder; this re-checks both from the session.
 */
export async function setAvatar(path: unknown): Promise<AvatarResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { ok: false, code: "not_signed_in" };
  if (claims.is_anonymous === true) return { ok: false, code: "google_only" };
  const userId = claims.sub;
  if (
    path !== null &&
    (typeof path !== "string" || !isOwnAvatarPath(userId, path))
  ) {
    return { ok: false, code: "invalid_path" };
  }

  const { data: before } = await supabase
    .from("profile")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("profile")
    .update({ avatar_path: path })
    .eq("id", userId);
  if (error) {
    console.error("[profile] set avatar failed:", error.message);
    return { ok: false, code: "server_error" };
  }

  // The old file is no longer referenced. A failed removal only leaves an orphan file.
  const previous = before?.avatar_path;
  if (previous && previous !== path) {
    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([previous]);
    if (removeError) {
      console.error("[profile] old avatar not removed:", removeError.message);
    }
  }

  refresh();
  return { ok: true };
}
