"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type Holding = { normal: number; shiny: number };

/**
 * "My stickers" for one Pokémon on the prerendered detail page. A client island so the page
 * stays static: the session and the sticker rows (RLS: own rows only) are read in the browser.
 * Nothing is shown without a session: there is nothing to report yet.
 */
export function MyStickerBadge({ pokemonId }: { pokemonId: number }) {
  const t = useTranslations("detail.myStickers");
  const [holding, setHolding] = useState<Holding | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims.sub;
      if (!userId) {
        if (!cancelled) setHolding(null);
        return;
      }
      const { data: rows } = await supabase
        .from("user_sticker")
        .select("variant, quantity")
        .eq("user_id", userId)
        .eq("pokemon_id", pokemonId);
      if (cancelled || !rows) return;
      const next = { normal: 0, shiny: 0 };
      for (const row of rows) next[row.variant] += row.quantity;
      setHolding(next);
    }

    void load();
    const stop = onAccountChange(() => void load());
    return () => {
      cancelled = true;
      stop();
    };
  }, [pokemonId]);

  if (!holding) return null;

  const owned = holding.normal + holding.shiny > 0;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {owned ? (
        <>
          <span className="rounded-full bg-(--type-soft) px-2.5 py-1 font-bold text-(--type-ink)">
            {t("owned", { normal: holding.normal, shiny: holding.shiny })}
          </span>
          {holding.shiny > 0 && (
            <span className="rounded-full bg-volt px-2.5 py-1 font-bold text-charcoal">
              ✦ {t("shinyOwned")}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-muted">{t("none")}</span>
          <Link href="/" className="font-bold underline underline-offset-2">
            {t("toQuiz")}
          </Link>
        </>
      )}
    </p>
  );
}
