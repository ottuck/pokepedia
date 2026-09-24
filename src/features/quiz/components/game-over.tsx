"use client";

import { m } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { spring } from "@/lib/motion";
import { useQuizStore } from "../store";

export function GameOver() {
  const t = useTranslations("quiz.gameover");
  const locale = useLocale();
  const run = useQuizStore((s) => s.run);
  const gameOver = useQuizStore((s) => s.gameOver);
  const stickers = useQuizStore((s) => s.stickersThisRun);
  const start = useQuizStore((s) => s.start);
  if (!run || !gameOver) return null;

  const stats = [
    { label: t("score"), value: run.score.toLocaleString() },
    { label: t("roundsCleared"), value: run.roundsCleared },
    { label: t("bestCombo"), value: run.bestCombo },
  ];

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-10 text-center sm:px-10">
      <h1 className="text-3xl font-black">{t(gameOver.reason)}</h1>
      <p className="text-sm text-ink/70">
        {t("answer", { name: gameOver.revealed.name })}
      </p>

      <dl className="grid w-full max-w-md grid-cols-3 gap-3">
        {stats.map(({ label, value }, index) => (
          <m.div
            key={label}
            className="rounded-2xl bg-white/80 p-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.gentle, delay: index * 0.1 }}
          >
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-mono text-2xl font-black">{value}</dd>
          </m.div>
        ))}
      </dl>

      <section className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-bold">{t("stickers")}</h2>
        {stickers.length === 0 ? (
          <p className="text-sm text-muted">{t("noStickers")}</p>
        ) : (
          <ul className="flex flex-wrap justify-center gap-2">
            {stickers.map(({ revealed, variant }, index) => (
              <li
                key={`${revealed.id}-${index}`}
                className={`relative size-16 rounded-xl border-4 bg-white ${variant === "shiny" ? "border-volt" : "border-white"}`}
              >
                <Image
                  src={revealed.artworkUrl}
                  alt={revealed.name}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => void start(locale)}
          className="rounded-full bg-ink px-6 py-2 font-black text-white"
        >
          {t("playAgain")}
        </button>
        <Link href="/" className="rounded-full bg-white px-6 py-2 font-black">
          {t("toDex")}
        </Link>
      </div>
    </div>
  );
}
