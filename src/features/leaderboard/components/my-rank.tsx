"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type Standing =
  | { status: "loading" | "signedOut" | "unranked" }
  | { status: "ranked"; rank: number; score: number; bestCombo: number };

/**
 * The viewer's own standing, read in the browser so the ranking page itself stays cached.
 * Nicknames are not unique and user ids are never public, so "you" is a separate card
 * rather than a highlighted row.
 */
export function MyRank() {
  const t = useTranslations("leaderboard.mine");
  const [standing, setStanding] = useState<Standing>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: session } = await supabase.auth.getClaims();
      if (!session?.claims) {
        if (!cancelled) setStanding({ status: "signedOut" });
        return;
      }
      const { data } = await supabase.rpc("my_leaderboard_rank");
      if (cancelled) return;
      const row = data?.[0];
      setStanding(
        row
          ? {
              status: "ranked",
              rank: row.rank,
              score: row.score,
              bestCombo: row.best_combo,
            }
          : { status: "unranked" },
      );
    }

    void load();
    const stop = onAccountChange(() => void load());
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (standing.status === "loading") {
    return (
      <div className="h-20 rounded-2xl bg-ink/5 motion-safe:animate-pulse" />
    );
  }

  return (
    <section
      aria-label={t("label")}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-volt/20 p-4"
    >
      {standing.status === "ranked" ? (
        <p className="font-bold">
          {t("ranked", {
            rank: standing.rank,
            score: standing.score,
            combo: standing.bestCombo,
          })}
        </p>
      ) : (
        <p className="text-sm">
          {standing.status === "signedOut" ? t("signedOut") : t("unranked")}
        </p>
      )}
      <Link
        href="/"
        className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-surface"
      >
        {t("play")}
      </Link>
    </section>
  );
}
