"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import {
  applyTheme,
  nextTheme,
  readTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme";

/** Cycles system → light → dark. The server snapshot is "system": pages are prerendered. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    (): Theme => "system",
  );

  return (
    <button
      type="button"
      onClick={() => applyTheme(nextTheme(theme))}
      aria-label={t("switch", { current: t(theme) })}
      title={t("switch", { current: t(theme) })}
      className="flex size-9 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "size-5",
  } as const;

  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
