"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { artworkUrl } from "@/features/pokemon/assets";
import styles from "./intro.module.css";

/** Winged Gen 1 Pokémon that take turns crossing the title sky. */
const FLYERS = [146, 144, 145, 6, 18, 149, 142];
const flyerPath = (id: number) => `normal/${String(id).padStart(3, "0")}.webp`;

// Fixed spots for the sparkle trail over the clouds.
const SPARKLES = [
  { left: "18%", top: "30%", delay: "0s" },
  { left: "31%", top: "62%", delay: "0.4s" },
  { left: "47%", top: "18%", delay: "0.9s" },
  { left: "63%", top: "55%", delay: "0.2s" },
  { left: "78%", top: "25%", delay: "0.7s" },
  { left: "88%", top: "68%", delay: "1.1s" },
];

type Props = {
  starting: boolean;
  onStart: () => void;
  onShowRules: () => void;
};

/**
 * The quiz title screen, in the manner of a Game Boy Color title: sky, clouds, a silhouette
 * crossing with a sparkle trail, and PRESS START (Enter, Space, Z, a click or a tap).
 */
export function TitleScreen({ starting, onStart, onShowRules }: Props) {
  const t = useTranslations("quiz.titleScreen");
  const [flyer, setFlyer] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (starting || event.repeat) return;
      if (event.key === "Enter" || event.key === " " || event.key === "z") {
        event.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, starting]);

  return (
    <div
      className={styles.title}
      onClick={() => {
        if (!starting) onStart();
      }}
    >
      <div aria-hidden className={styles.sky}>
        <div
          className={styles.flight}
          // A new Pokémon on every pass across the sky.
          onAnimationIteration={() =>
            setFlyer((index) => (index + 1) % FLYERS.length)
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, filtered to a silhouette */}
          <img
            src={artworkUrl(flyerPath(FLYERS[flyer]))}
            alt=""
            className={styles.flyer}
          />
        </div>
        <div className={styles.sparkles}>
          {SPARKLES.map((sparkle) => (
            <span
              key={sparkle.left}
              className={styles.sparkle}
              style={{
                left: sparkle.left,
                top: sparkle.top,
                animationDelay: sparkle.delay,
              }}
            />
          ))}
        </div>
        <div className={styles.clouds} />
      </div>

      <h1 className={styles.logo}>
        Poke<span className={styles.logoAccent}>pedia</span>
      </h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>

      <button
        type="button"
        className={styles.press}
        disabled={starting}
        onClick={(event) => {
          event.stopPropagation();
          onStart();
        }}
      >
        {starting ? t("starting") : `▶ ${t("pressStart")}`}
      </button>

      <div className={styles.footer}>
        <span>{t("copyright")}</span>
        <button
          type="button"
          className={styles.rulesLink}
          onClick={(event) => {
            event.stopPropagation();
            onShowRules();
          }}
        >
          {t("rules")}
        </button>
      </div>
    </div>
  );
}
