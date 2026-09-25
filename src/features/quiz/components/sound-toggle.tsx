"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { isSoundOn, setSoundOn, subscribeSound } from "../sound-settings";

/** Speaker button on the Pokédex frame. Off by default; the server snapshot is "off". */
export function SoundToggle() {
  const t = useTranslations("quiz.sound");
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => false);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t("label")}
      title={on ? t("on") : t("off")}
      onClick={() => setSoundOn(!on)}
      className="ml-auto flex size-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 aria-pressed:bg-white aria-pressed:text-dex-red"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
        {on ? (
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        ) : (
          <path d="m16 9 6 6M22 9l-6 6" />
        )}
      </svg>
    </button>
  );
}
