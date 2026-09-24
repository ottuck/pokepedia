"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

type Props = {
  /** Server-rendered artwork images; the client only decides which one is shown. */
  normal: ReactNode;
  shiny: ReactNode;
};

/**
 * Detail artwork with a shiny toggle. The shiny image is not mounted until the first switch,
 * so its file is only downloaded when someone asks for it. After that both stay mounted and
 * the switch is an instant cross-fade.
 */
export function ArtworkViewer({ normal, shiny }: Props) {
  const t = useTranslations("detail");
  const [showShiny, setShowShiny] = useState(false);
  const [shinyMounted, setShinyMounted] = useState(false);

  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none"
        style={{ opacity: showShiny ? 0 : 1 }}
        aria-hidden={showShiny}
      >
        {normal}
      </div>
      {shinyMounted && (
        <div
          className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none"
          style={{ opacity: showShiny ? 1 : 0 }}
          aria-hidden={!showShiny}
        >
          {shiny}
        </div>
      )}
      <button
        type="button"
        aria-pressed={showShiny}
        onClick={() => {
          setShinyMounted(true);
          setShowShiny((shown) => !shown);
        }}
        className="absolute right-0 -bottom-8 z-10 rounded-full bg-card/85 px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-ink/10 backdrop-blur transition-colors hover:bg-card aria-pressed:bg-volt aria-pressed:text-charcoal"
      >
        ✦ {t("shinyToggle")}
      </button>
    </>
  );
}
