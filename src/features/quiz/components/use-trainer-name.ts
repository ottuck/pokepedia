"use client";

import { useEffect, useState } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { createClient } from "@/lib/supabase/browser";

/**
 * The player's nickname for the battle info box, read in the browser like the header's
 * account menu (RLS limits the read to the player's own profile). Null until loaded, or
 * when there is no profile yet; the first game creates a guest and announces it.
 */
export function useTrainerName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const { data } = await supabase
          .from("profile")
          .select("nickname")
          .maybeSingle();
        if (!cancelled) setName(data?.nickname ?? null);
      } catch {
        // Only a label: the info box falls back to a generic name.
      }
    }

    void load();
    const stopListening = onAccountChange(() => void load());
    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  return name;
}
