"use client";

import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Endonyms: each language is shown in its own script, so these are not translated.
const LOCALE_NAMES = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
} as const satisfies Record<Locale, string>;

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex gap-1 rounded-full bg-ink/5 p-1 text-sm">
        {routing.locales.map((locale) => {
          const isCurrent = locale === currentLocale;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "block rounded-full bg-surface px-2.5 py-1 font-medium whitespace-nowrap shadow-sm sm:px-3"
                    : "block rounded-full px-2.5 py-1 whitespace-nowrap text-muted hover:text-ink sm:px-3"
                }
              >
                {/* Phones show the code so the switcher fits next to the logo. */}
                <span aria-hidden className="sm:hidden">
                  {locale.toUpperCase()}
                </span>
                <span className="max-sm:sr-only">{LOCALE_NAMES[locale]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
