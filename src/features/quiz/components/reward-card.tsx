"use client";

import { m } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Tilt } from "@/components/tilt";
import { Link } from "@/i18n/navigation";
import { BATTLE_PLAYABLE_IDS } from "@/features/battle/host";
import { spring } from "@/lib/motion";
import { formatDexNumber } from "@/features/pokemon/format";
import { useQuizStore } from "../store";

/** The sticker falls in face down and flips to show what was won. */
export function RewardCard() {
  const t = useTranslations("quiz.reward");
  const reward = useQuizStore((s) => s.reward);
  const advance = useQuizStore((s) => s.advance);
  if (!reward) return null;

  const { revealed, sticker, scoreGained } = reward;
  const shiny = sticker.variant === "shiny";
  // A sticker the battle game can use: invite the player to battle with it. The run stays
  // active, so coming back to the game resumes it.
  const canBattle = BATTLE_PLAYABLE_IDS.includes(revealed.id);
  // The first time: one gold button, so a new player's first sticker leads straight into the
  // battle. Later clears of the same Pokémon keep both choices.
  const firstBattle = canBattle && sticker.isNew;

  return (
    <m.div
      className="absolute inset-0 z-10 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        className="flex flex-col items-center gap-4"
      >
        <m.div
          className="relative w-52 [perspective:800px]"
          initial={{ y: -300, rotate: -12 }}
          animate={{ y: 0, rotate: 0 }}
          transition={spring.bouncy}
        >
          <Tilt holo={shiny} max={14} className="rounded-3xl">
            <m.div
              className="relative rounded-3xl border-[6px] border-card bg-card p-3 shadow-2xl [transform-style:preserve-3d]"
              initial={{ rotateY: 180 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: shiny ? 0.9 : 0.4, duration: 0.6 }}
            >
              <div
                className={`relative aspect-square overflow-hidden rounded-2xl ${shiny ? "bg-linear-to-br from-volt/60 via-pink-200 to-sky-200" : "bg-dex-screen/60"}`}
              >
                <Image
                  src={revealed.artworkUrl}
                  alt={revealed.name}
                  fill
                  sizes="208px"
                  className="object-contain p-2"
                />
                {shiny && (
                  // Holographic sheen sweeping across a shiny sticker.
                  <m.div
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/70 to-transparent"
                    initial={{ x: "-120%" }}
                    animate={{ x: "120%" }}
                    transition={{
                      delay: 1.5,
                      duration: 1.2,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                    }}
                  />
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p id="reward-title" className="font-black">
                  {revealed.name}
                </p>
                <p className="text-xs text-muted tabular-nums">
                  {formatDexNumber(revealed.id)}
                </p>
              </div>
            </m.div>
          </Tilt>
        </m.div>

        <m.p
          className="rounded-full bg-card px-4 py-1 text-sm font-black"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.bouncy, delay: 1 }}
        >
          {shiny
            ? `✦ ${t("shiny")}`
            : sticker.isNew
              ? t("newSticker")
              : t("duplicate", { quantity: sticker.quantity })}
          <span className="ml-2 text-danger">
            {t("scoreGained", { score: scoreGained })}
          </span>
        </m.p>

        {firstBattle ? (
          <m.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <p className="rounded-full bg-card px-3 py-1 text-xs font-bold">
              {t("battleUnlocked", { name: revealed.name })}
            </p>
            <m.div
              className="rounded-full bg-linear-to-br from-amber-200 via-amber-500 to-yellow-700 p-[3px] shadow-[0_0_28px_rgba(245,158,11,0.7)]"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Link
                href="/battle"
                autoFocus
                className="block rounded-full bg-linear-to-r from-amber-300 via-yellow-200 to-amber-400 px-7 py-2.5 font-black text-ink"
              >
                ⚔ {t("battle", { name: revealed.name })}
              </Link>
            </m.div>
          </m.div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {canBattle && (
              <Link
                href="/battle"
                className="rounded-full bg-ink px-6 py-2 font-black text-surface shadow-lg"
              >
                {t("battle", { name: revealed.name })}
              </Link>
            )}
            <button
              type="button"
              autoFocus
              onClick={advance}
              className="rounded-full bg-volt px-6 py-2 font-black text-ink shadow-lg"
            >
              {t("continue")}
            </button>
          </div>
        )}
      </div>
    </m.div>
  );
}
