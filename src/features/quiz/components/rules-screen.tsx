"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import styles from "./intro.module.css";
import { useTypewriter } from "./use-typewriter";

const PAGES = ["p1", "p2", "p3", "p4", "p5"] as const;

type Props = {
  starting: boolean;
  /** Called after the last page or on skip. */
  onDone: () => void;
};

/**
 * The rules as a Game Boy text box: one page at a time, printed letter by letter. The A
 * button (Enter, Space, Z, click) finishes the line, then turns the page; B/Esc skips all.
 */
export function RulesScreen({ starting, onDone }: Props) {
  const t = useTranslations("quiz.rulesScreen");
  const [page, setPage] = useState(0);
  const text = useTypewriter(t(PAGES[page]));
  const last = page === PAGES.length - 1;

  const advance = () => {
    if (starting) return;
    if (!text.done) return text.finish();
    if (last) onDone();
    else setPage(page + 1);
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
          {t("heading")} {page + 1}/{PAGES.length}
        </span>
        <button
          type="button"
          className={styles.skip}
          disabled={starting}
          onClick={onDone}
        >
          {t("skip")}
        </button>
      </div>

      <div
        className={styles.textbox}
        onClick={advance}
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Screen readers get the whole page at once, not letter by letter. */}
        <span aria-hidden>{starting ? t("starting") : text.shown}</span>
        <span className="sr-only">
          {starting ? t("starting") : t(PAGES[page])}
        </span>
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
