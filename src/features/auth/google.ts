"use client";

import type { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

/**
 * Anonymous players link Google to the account they already have, so their collection
 * survives; everyone else signs in normally. Either way the browser leaves for Google and
 * comes back through /auth/callback to the current page.
 */
export async function continueWithGoogle(
  linkToCurrentUser: boolean,
  router: ReturnType<typeof useRouter>,
  /** Where to land afterwards; defaults to the current page. */
  next = window.location.pathname + window.location.search,
) {
  const supabase = createClient();
  const options = {
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
  };
  const { error } = linkToCurrentUser
    ? await supabase.auth.linkIdentity({ provider: "google", options })
    : await supabase.auth.signInWithOAuth({ provider: "google", options });
  // On success the browser is already leaving for Google; only failures stay here.
  if (error) {
    router.push({
      pathname: "/auth/error",
      query: { code: error.code ?? "oauth_failed" },
    });
  }
}
