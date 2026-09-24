"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { SORT_OPTIONS, type DexFilters, type SortOption } from "../explore";
import { typeStyle, type PokemonType } from "../types";

type Props = {
  filters: DexFilters;
  types: readonly PokemonType[];
  onChange: (next: Partial<DexFilters>) => void;
};

const SORT_LABEL_KEYS = { number: "sortNumber", name: "sortName" } as const;

export function DexToolbar({ filters, types, onChange }: Props) {
  const t = useTranslations("dex");
  const tType = useTranslations("types");
  const searchId = useId();
  const sortId = useId();
  const chipsRef = useRef<HTMLDivElement>(null);

  // On phones the chips scroll sideways; keep the active one visible (e.g. from a shared URL).
  useEffect(() => {
    chipsRef.current
      ?.querySelector("[aria-pressed=true]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [filters.type]);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border-2 border-ink/10 bg-white px-5 text-base transition-colors outline-none placeholder:text-muted focus:border-dex-red"
          />
        </div>
        <label htmlFor={sortId} className="sr-only">
          {t("sortLabel")}
        </label>
        <select
          id={sortId}
          value={filters.sort}
          onChange={(event) =>
            onChange({ sort: event.target.value as SortOption })
          }
          className="h-11 shrink-0 rounded-full border-2 border-ink/10 bg-white px-3 text-sm font-medium outline-none focus:border-dex-red sm:px-4"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(SORT_LABEL_KEYS[option])}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={chipsRef}
        role="group"
        aria-label={t("typeFilterLabel")}
        // One swipeable row on phones, wrapping rows from sm up.
        className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <TypeChip
          pressed={filters.type === null}
          onClick={() => onChange({ type: null })}
        >
          {t("allTypes")}
        </TypeChip>
        {types.map((type) => (
          <TypeChip
            key={type}
            type={type}
            pressed={filters.type === type}
            // Pressing the active type again goes back to "all".
            onClick={() =>
              onChange({ type: filters.type === type ? null : type })
            }
          >
            {tType(type)}
          </TypeChip>
        ))}
      </div>
    </div>
  );
}

function TypeChip({
  type,
  pressed,
  onClick,
  children,
}: {
  type?: PokemonType;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={type ? typeStyle(type, null) : undefined}
      className={
        type
          ? // Pressed uses ink, not base: white on base fails contrast for light types (electric, ice).
            "shrink-0 rounded-full border-2 border-(--type) bg-(--type-soft) px-3 py-1 text-sm font-semibold text-(--type-ink) transition-colors aria-pressed:border-(--type-ink) aria-pressed:bg-(--type-ink) aria-pressed:text-white"
          : "shrink-0 rounded-full border-2 border-ink px-3 py-1 text-sm font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-surface"
      }
    >
      {children}
    </button>
  );
}
