"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { onAccountChange } from "@/features/auth/account-events";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useQuizStore } from "@/features/quiz/store";
import { BATTLE_STARTER_ID } from "../host";

/**
 * Above the game: tells a new player that the quiz leads to a Pokémon battle, so the first
 * screen gives a reason to stay. A player without the battle starter's sticker gets it as the
 * first question (quiz service), so "get the first one right and battle" is literally true;
 * one who already owns it is pointed at the battle instead. Ownership is read in the browser
 * (RLS: own rows) to keep the home page static.
 */
export function BattleTeaser() {
  const t = useTranslations("quiz.teaser");
  const [ownsStarter, setOwnsStarter] = useState(false);
  const phase = useQuizStore((s) => s.phase);
  const seq = useQuizStore((s) => s.round?.seq);
  // Winning the starter in this run makes the player an owner right away (no account event fires).
  const wonStarter = useQuizStore((s) =>
    s.stickersThisRun.some(
      (sticker) => sticker.revealed.id === BATTLE_STARTER_ID,
    ),
  );
  const owner = ownsStarter || wonStarter;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let version = 0;

    async function load() {
      const request = ++version;
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims.sub;
      if (cancelled || request !== version) return;
      if (!userId) {
        setOwnsStarter(false);
        return;
      }
      const { count } = await supabase
        .from("user_sticker")
        .select("pokemon_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("pokemon_id", BATTLE_STARTER_ID);
      if (cancelled || request !== version) return;
      setOwnsStarter((count ?? 0) > 0);
    }

    void load();
    const stop = onAccountChange(() => void load());
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // The promise is about question 1 of a run. Once a run has moved past it without the starter
  // (skipped or missed), it cannot come true this run: hide until the next run's lobby.
  const inRun =
    phase !== "lobby" && phase !== "starting" && phase !== "gameover";
  if (!owner && inRun && (seq ?? 1) > 1) return null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl bg-linear-to-br from-amber-200 via-amber-500 to-yellow-700 p-[3px] shadow-lg shadow-amber-500/30">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[13px] bg-card px-4 py-3">
        <m.span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-amber-300 to-amber-500 text-xl text-ink shadow-inner"
          animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }}
        >
          ⚔
        </m.span>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-tight font-black">
            {owner ? t("ownerTitle") : t("newTitle")}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {owner ? t("ownerBody") : t("newBody")}
          </p>
        </div>
        {owner && (
          <Link
            href="/battle"
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-black text-surface"
          >
            {t("ownerLink")}
          </Link>
        )}
        {/* A light sweep across the banner now and then, to catch the eye without flashing. */}
        <m.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/60 to-transparent"
          initial={{ x: "-150%" }}
          animate={{ x: "350%" }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            repeatDelay: 2.4,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}
