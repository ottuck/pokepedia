"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  {
    href: "/",
    key: "dex",
    match: (path: string) => path === "/" || path.startsWith("/pokemon"),
  },
  {
    href: "/quiz",
    key: "quiz",
    match: (path: string) => path.startsWith("/quiz"),
  },
  {
    href: "/collection",
    key: "collection",
    match: (path: string) => path.startsWith("/collection"),
  },
  {
    href: "/leaderboard",
    key: "leaderboard",
    match: (path: string) => path.startsWith("/leaderboard"),
  },
] as const;

export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("main")}>
      <ul className="flex flex-wrap gap-1 text-sm font-bold">
        {ITEMS.map(({ href, key, match }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={match(pathname) ? "page" : undefined}
              className="rounded-full px-2.5 py-1.5 whitespace-nowrap text-muted hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-surface sm:px-3"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
