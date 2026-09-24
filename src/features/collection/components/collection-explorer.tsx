"use client";

import { AnimatePresence, LazyMotion, m, MotionConfig } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { loadMotionFeatures, spring } from "@/lib/motion";
import {
  COLLECTION_FILTERS,
  matchesFilter,
  type CollectionFilter,
  type Holding,
} from "../summary";

type Props = {
  ids: number[];
  holdings: Record<number, Holding>;
  /** Server-rendered sticker cards keyed by dex number. */
  cards: Record<number, ReactNode>;
};

export function CollectionExplorer({ ids, holdings, cards }: Props) {
  const t = useTranslations("collection.filters");
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const visible = ids.filter((id) => matchesFilter(holdings[id], filter));

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring.gentle}>
        <div
          role="group"
          aria-label={t("label")}
          className="mb-4 flex flex-wrap gap-1.5"
        >
          {COLLECTION_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className="rounded-full border-2 border-ink px-3 py-1 text-sm font-semibold aria-pressed:bg-ink aria-pressed:text-surface"
            >
              {t(value)}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("empty")}</p>
        ) : (
          <ul className="relative grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((id) => (
                <m.li
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                >
                  {cards[id]}
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
