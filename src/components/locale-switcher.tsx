"use client";

import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { placeUnder } from "./anchored-popover";

// Endonyms: each language is shown in its own script, so these are not translated.
const LOCALE_NAMES = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
} as const satisfies Record<Locale, string>;

/**
 * A compact button (globe + code) that opens the language list, so the header fits the narrow
 * page column next to the account button. No flags: a language is not a country, and Windows
 * shows flag emoji as letters.
 */
export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();
  const menuId = useId();

  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        onClick={(event) => placeUnder(event.currentTarget, menuId)}
        aria-label={`${t("label")}: ${LOCALE_NAMES[currentLocale]}`}
        className="flex h-9 items-center gap-1.5 rounded-full bg-ink/5 px-3 text-sm font-semibold hover:bg-ink/10"
      >
        <GlobeIcon />
        <span aria-hidden>{currentLocale.toUpperCase()}</span>
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-muted">
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <nav
        id={menuId}
        popover="auto"
        aria-label={t("label")}
        className="fixed inset-auto m-0 w-44 rounded-2xl bg-card p-2 text-sm shadow-xl ring-1 ring-ink/10"
      >
        <ul>
          {routing.locales.map((locale) => {
            const isCurrent = locale === currentLocale;
            return (
              <li key={locale}>
                <Link
                  href={pathname}
                  locale={locale}
                  lang={locale}
                  aria-current={isCurrent ? "page" : undefined}
                  // Client navigation keeps the header mounted, so close the popover by hand.
                  onClick={() => document.getElementById(menuId)?.hidePopover()}
                  className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-ink/5 aria-[current=page]:font-bold"
                >
                  {LOCALE_NAMES[locale]}
                  {isCurrent && (
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className="size-4 text-dex-red"
                    >
                      <path
                        d="m3.5 8.5 3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function GlobeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4">
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M2.5 10h15M10 2.5c2.2 2.1 3.2 4.6 3.2 7.5s-1 5.4-3.2 7.5M10 2.5C7.8 4.6 6.8 7.1 6.8 10s1 5.4 3.2 7.5" />
      </g>
    </svg>
  );
}
