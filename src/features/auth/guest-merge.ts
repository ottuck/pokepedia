import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Guest record merge (see the guest_merge migration). The raw token lives only in an httpOnly
 * cookie scoped to the auth callback; the database stores its sha256.
 */
export const MERGE_COOKIE = "guest_merge";
export const MERGE_TTL_SECONDS = 600;

export const mergeCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // The callback is a top-level GET coming back from Google, which Lax cookies allow.
  sameSite: "lax",
  path: "/auth/callback",
  maxAge: MERGE_TTL_SECONDS,
} as const;

export function newMergeToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashMergeToken(token) };
}

export function hashMergeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type RedeemResult =
  { ok: true; mergedUserId: string } | { ok: false; code: "merge_failed" };

/**
 * Moves the guest's record into `toUserId` and only then deletes the guest user. The RPC
 * consumes the ticket and moves everything in one transaction, so a failure leaves the guest
 * untouched; a failed delete afterwards only leaves an empty guest for the cleanup job.
 * `toUserId` must come from the signed-in (non-guest) session, never from the request.
 */
export async function redeemGuestMerge(
  admin: SupabaseClient<Database>,
  token: string,
  toUserId: string,
): Promise<RedeemResult> {
  const { data: fromUserId, error } = await admin.rpc("guest_merge_redeem", {
    p_token_hash: hashMergeToken(token),
    p_to_user: toUserId,
  });
  if (error || !fromUserId) {
    console.error("[auth] guest merge failed:", error?.message);
    return { ok: false, code: "merge_failed" };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(fromUserId);
  if (deleteError) {
    console.error("[auth] merged guest not deleted:", deleteError.message);
  }
  return { ok: true, mergedUserId: fromUserId };
}
