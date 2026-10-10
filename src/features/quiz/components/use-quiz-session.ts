"use client";

import { useEffect } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { createClient } from "@/lib/supabase/browser";
import { useQuizStore } from "../store";

/** Keep the battle tied to its player, including sign-out in another browser tab. */
export function useQuizSession() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let version = 0;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      version++;
      if (event === "SIGNED_OUT") useQuizStore.getState().reset();
      useQuizStore.getState().syncSessionUser(session?.user.id ?? null);
    });

    // Starting a guest on the server does not emit a browser auth event.
    const stop = onAccountChange(() => {
      const request = ++version;
      void supabase.auth
        .getClaims()
        .then(({ data }) => {
          if (!cancelled && request === version)
            useQuizStore.getState().syncSessionUser(data?.claims.sub ?? null);
        })
        .catch(() => {
          // The next auth event refreshes ownership; a failed label refresh must not end a game.
        });
    });
    return () => {
      cancelled = true;
      stop();
      data.subscription.unsubscribe();
    };
  }, []);
}
