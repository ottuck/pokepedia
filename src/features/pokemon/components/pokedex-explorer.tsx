"use client";

import { AnimatePresence, LazyMotion, m, MotionConfig } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadMotionFeatures, spring } from "@/lib/motion";
import {
  buildSearchIndex,
  DEFAULT_FILTERS,
  filterDex,
  parseDexParams,
  presentTypes,
  toDexParams,
  type DexEntry,
  type DexFilters,
} from "../explore";
import { DexToolbar } from "./dex-toolbar";

// Keep in sync with ARTWORK_SIZES in pokemon-card.tsx.
const GRID_CLASS =
  "relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

type Props = {
  entries: DexEntry[];
  /**
   * Cards rendered on the server, keyed by dex number. The client only decides which ones to
   * show and in what order, so card markup and next/image logic stay out of the JS bundle.
   */
  cards: Record<number, ReactNode>;
};

export function PokedexExplorer(props: Props) {
  // useSearchParams makes this subtree client-rendered; the fallback is the full, unfiltered
  // grid so the prerendered HTML still contains every card.
  return (
    <Suspense
      fallback={
        <ul className={GRID_CLASS}>
          {props.entries.map((entry) => (
            <li key={entry.id}>{props.cards[entry.id]}</li>
          ))}
        </ul>
      }
    >
      <Explorer {...props} />
    </Suspense>
  );
}

function Explorer({ entries, cards }: Props) {
  const t = useTranslations("dex");
  const locale = useLocale();
  const searchParams = useSearchParams();

  // The URL seeds the filters once; afterwards local state drives the UI and the URL follows.
  // (Binding the input straight to the URL would fight Korean/Japanese IME composition.)
  const [filters, setFilters] = useState<DexFilters>(() =>
    parseDexParams(searchParams),
  );
  const updateFilters = useCallback(
    (next: Partial<DexFilters>) =>
      setFilters((current) => ({ ...current, ...next })),
    [],
  );

  useEffect(() => {
    const query = toDexParams(filters).toString();
    const url = query ? `?${query}` : window.location.pathname;
    // replaceState: filters are shareable, but typing should not flood the back button.
    window.history.replaceState(null, "", url);
  }, [filters]);

  // Typing stays responsive; the 151-card filter + layout animation can lag a frame behind.
  const deferredQuery = useDeferredValue(filters.query);
  const index = useMemo(() => buildSearchIndex(entries), [entries]);
  const types = useMemo(() => presentTypes(entries), [entries]);
  const visible = useMemo(
    () =>
      filterDex(entries, { ...filters, query: deferredQuery }, locale, index),
    [entries, filters, deferredQuery, locale, index],
  );
  const isFiltered = filters.query.trim() !== "" || filters.type !== null;

  return (
    <>
      <DexToolbar filters={filters} types={types} onChange={updateFilters} />

      <p aria-live="polite" className="mb-3 text-sm text-muted empty:mb-0">
        {isFiltered &&
          t("resultCount", { count: visible.length, total: entries.length })}
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-lg font-bold">{t("emptyTitle")}</p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface"
          >
            {t("resetFilters")}
          </button>
        </div>
      ) : (
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user" transition={spring.gentle}>
            <ul className={GRID_CLASS}>
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((entry) => (
                  <m.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    {cards[entry.id]}
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          </MotionConfig>
        </LazyMotion>
      )}
    </>
  );
}
