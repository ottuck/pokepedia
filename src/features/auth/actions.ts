"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  MERGE_COOKIE,
  MERGE_TTL_SECONDS,
  mergeCookieOptions,
  newMergeToken,
} from "./guest-merge";

export type PrepareMergeResult =
  { ok: true } | { ok: false; code: "not_guest" | "server_error" };

/**
 * Step 1 of the guest merge, while the player is still the guest: issue a one-time ticket for
 * this guest (the user id comes from the session only) and hand its token to the browser in
 * an httpOnly cookie. The client then signs in with Google; the auth callback redeems it.
 */
export async function prepareGuestMerge(): Promise<PrepareMergeResult> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims || claims.is_anonymous !== true) {
      return { ok: false, code: "not_guest" };
    }

    const { token, hash } = newMergeToken();
    const { error } = await createAdminClient().rpc(
      "guest_merge_create_ticket",
      {
        p_from_user: claims.sub,
        p_token_hash: hash,
        p_ttl_seconds: MERGE_TTL_SECONDS,
      },
    );
    if (error) throw new Error(error.message);

    (await cookies()).set(MERGE_COOKIE, token, mergeCookieOptions);
    return { ok: true };
  } catch (error) {
    console.error("[auth] prepareGuestMerge failed:", error);
    return { ok: false, code: "server_error" };
  }
}
