"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { NAME_COLUMNS, profileName } from "@/features/profile/display";
import { createClient } from "@/lib/supabase/browser";

/**
 * The player's name for the battle info box (generated or chosen, in the page language),
 * read in the browser like the header's account menu (RLS limits the read to the player's
 * own profile). Null until loaded, or when there is no profile yet; the first game creates a
 * guest and announces it.
 */
export function useTrainerName() {
  const locale = useLocale();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let version = 0;
    const supabase = createClient();

    async function load() {
      const request = ++version;
      try {
        const { data } = await supabase
          .from("profile")
          .select(NAME_COLUMNS)
          .maybeSingle();
        if (!cancelled && request === version)
          setName(data ? profileName(data, locale) : null);
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
  }, [locale]);

  return name;
}
