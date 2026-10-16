"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RULES, comboMultiplier } from "../rules";
import styles from "./intro.module.css";
import { useTypewriter } from "./use-typewriter";

/** First visit: only what is needed to start. "How to play" on the title shows everything. */
const PAGES = {
  intro: ["goal", "fight", "combo"],
  full: ["goal", "fight", "hint", "skip", "score"],
} as const;

type Props = {
  mode: keyof typeof PAGES;
  starting: boolean;
  /** Called after the last page or on skip. */
  onDone: () => void;
};

const percent = (ratio: number) => Math.round(ratio * 100);
const multiplier = (value: number) => value.toFixed(1);
const MAX_COMBO_MULTIPLIER = multiplier(
  comboMultiplier(RULES.comboBonusMaxSteps + 1),
);

/** The score page is a table rather than typed text; every number comes from `RULES`. */
function ScoreTable() {
  const t = useTranslations("quiz.rulesScreen.score");
  // rules.ts lists the tiers from the highest combo down; the test pins that order.
  const [top, mid, base] = RULES.shinyTiers;

  return (
    <div className={styles.score}>
      <p className={styles.scoreTitle}>{t("title")}</p>
      <dl className={styles.scoreList}>
        {([3, 2, 1] as const).map((hp) => (
          <div key={hp} className={styles.scoreRow}>
            <dt>{t(`hp${hp}`)}</dt>
            <dd className={styles.scorePoints}>
              {t("points", { points: RULES.baseScore[hp] })}
            </dd>
          </div>
        ))}
      </dl>
      <dl className={styles.scoreList}>
        <div className={styles.scoreRow}>
          <dt>{t("comboLabel")}</dt>
          <dd>
            {t("comboValue", {
              percent: percent(RULES.comboBonusPerStep),
              max: MAX_COMBO_MULTIPLIER,
            })}
          </dd>
        </div>
        <div className={styles.scoreRow}>
          <dt>{t("shinyLabel")}</dt>
          <dd>
            {t("shinyValue", {
              base: percent(base.chance),
              midCombo: mid.minCombo,
              mid: percent(mid.chance),
              topCombo: top.minCombo,
              top: percent(top.chance),
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * The rules as a Game Boy text box: one page at a time, printed letter by letter. The A
 * button (Enter, Space, Z, click) finishes the line, then turns the page; B/Esc skips all.
 */
export function RulesScreen({ mode, starting, onDone }: Props) {
  const t = useTranslations("quiz.rulesScreen");
  const pages = PAGES[mode];
  const [index, setIndex] = useState(0);
  const id = pages[index];
  const isScore = id === "score";

  // The table has no text to print, so the typewriter is already done there.
  const pageText = isScore
    ? ""
    : t(id, {
        max: MAX_COMBO_MULTIPLIER,
        multiplier: multiplier(RULES.hintMultiplier),
        skips: RULES.skipsPerRun,
      });
  const text = useTypewriter(pageText);
  const last = index === pages.length - 1;

  const advance = () => {
    if (starting) return;
    if (!text.done) return text.finish();
    if (last) onDone();
    else setIndex(index + 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === "Enter" || event.key === " " || event.key === "z") {
        event.preventDefault();
        advance();
      } else if (event.key === "Escape" || event.key === "x") {
        event.preventDefault();
        if (!starting) onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={styles.rules}>
      <div aria-hidden className={styles.clouds} />
      <div className={styles.rulesTop}>
        <span>
          {t("heading")} {index + 1}/{pages.length}
        </span>
        <button
          type="button"
          className={styles.skip}
          disabled={starting}
          onClick={onDone}
        >
          {t("skipButton")}
        </button>
      </div>

      <div
        className={styles.textbox}
        onClick={advance}
        aria-live="polite"
        aria-atomic="true"
      >
        {isScore && !starting ? (
          <ScoreTable />
        ) : (
          <>
            {/* Screen readers get the whole page at once, not letter by letter. */}
            <span aria-hidden>{starting ? t("starting") : text.shown}</span>
            <span className="sr-only">
              {starting ? t("starting") : pageText}
            </span>
          </>
        )}
        {text.done && !starting && (
          <span aria-hidden className={styles.cursor}>
            ▼
          </span>
        )}
      </div>

      <button
        type="button"
        className="sr-only focus:not-sr-only focus:self-end"
        disabled={starting}
        onClick={advance}
      >
        {last ? t("start") : t("next")}
      </button>
    </div>
  );
}
