"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  // The game is the home page; the dex and its detail pages live under /pokedex and /pokemon.
  {
    href: "/",
    key: "quiz",
    match: (path: string) => path === "/",
  },
  {
    href: "/pokedex",
    key: "dex",
    match: (path: string) =>
      path.startsWith("/pokedex") || path.startsWith("/pokemon"),
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
      {/* Phones: a full-width tab bar over a divider (spare width shared, so long
          Japanese labels keep a gap). From md: pills next to the logo. */}
      <ul className="flex border-b border-ink/10 text-sm font-bold md:gap-1 md:border-0">
        {ITEMS.map(({ href, key, match }) => (
          <li key={key} className="flex-auto md:flex-none">
            <Link
              href={href}
              aria-current={match(pathname) ? "page" : undefined}
              className="-mb-px block border-b-2 border-transparent px-2 py-2.5 text-center whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-dex-red aria-[current=page]:text-ink md:mb-0 md:rounded-full md:border-0 md:px-3 md:py-1.5 md:aria-[current=page]:bg-ink md:aria-[current=page]:text-surface"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
