"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { usePointerTilt } from "@/components/use-pointer-tilt";
import styles from "./hero-card.module.css";

type Props = {
  /** Server-rendered artwork images; the client only decides which one is shown. */
  normal: ReactNode;
  shiny: ReactNode;
  number: string;
  name: string;
  genus: string;
  /** Server-rendered type badges. */
  types: ReactNode;
  height: string;
  weight: string;
};

/** Restrained on purpose: a detail page is read, not played with. */
const MAX_TILT = 10;

/**
 * The detail page's Pokémon card: a Pokepedia card print in the Pokémon's type colors that
 * turns toward the pointer, with the artwork floating in front of the frame, a foil band and
 * a glare that follow the light, and a rarer holographic print while the shiny art is shown.
 *
 * A client island inside the prerendered page: the images and badges arrive rendered from
 * the server. The shiny image mounts on the first switch, so its file is only downloaded
 * when asked for. The card's text repeats the page heading, so it is hidden from assistive
 * technology; the artwork keeps its alt text.
 */
export function HeroCard({
  normal,
  shiny,
  number,
  name,
  genus,
  types,
  height,
  weight,
}: Props) {
  const t = useTranslations("detail");
  const stage = usePointerTilt<HTMLDivElement>({
    maxDegrees: MAX_TILT,
    touch: true,
  });
  const [showShiny, setShowShiny] = useState(false);
  const [shinyMounted, setShinyMounted] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <div ref={stage} className={styles.stage}>
        <div className={styles.card} data-shiny={showShiny ? "" : undefined}>
          <div aria-hidden className={styles.face}>
            <div className={styles.window} />
            <div className={styles.foil} />
            <div className={styles.texture} />
          </div>
          <div aria-hidden className={styles.aura} />

          <div aria-hidden className={styles.top}>
            <span className={styles.number}>{number}</span>
            <span className={styles.types}>{types}</span>
          </div>

          <div className={styles.art}>
            <div
              className={styles.artwork}
              style={{ opacity: showShiny ? 0 : 1 }}
              aria-hidden={showShiny}
            >
              {normal}
            </div>
            {shinyMounted && (
              <div
                className={styles.artwork}
                style={{ opacity: showShiny ? 1 : 0 }}
                aria-hidden={!showShiny}
              >
                {shiny}
              </div>
            )}
          </div>

          <div aria-hidden className={styles.bottom}>
            <p className={styles.name}>{name}</p>
            <p className={styles.genus}>{genus}</p>
            <p className={styles.measures}>
              <span>{height}</span>
              <span>{weight}</span>
            </p>
          </div>

          <div aria-hidden className={styles.edge} />
          <div aria-hidden className={styles.glare} />
        </div>
        <div aria-hidden className={styles.shadow} />
      </div>

      <button
        type="button"
        aria-pressed={showShiny}
        onClick={() => {
          setShinyMounted(true);
          setShowShiny((shown) => !shown);
        }}
        className="-mt-4 mb-6 rounded-full bg-card/85 px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-ink/10 backdrop-blur transition-colors hover:bg-card aria-pressed:bg-volt aria-pressed:text-charcoal"
      >
        ✦ {t("shinyToggle")}
      </button>
    </div>
  );
}
