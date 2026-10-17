"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  // Order: the game, the battle it leads to, then the dex, the collection and the ranking.
  // The game is the home page; the dex and its detail pages live under /pokedex and /pokemon.
  {
    href: "/",
    key: "quiz",
    match: (path: string) => path === "/",
  },
  {
    href: "/battle",
    key: "battle",
    match: (path: string) => path.startsWith("/battle"),
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
      {/* A full-width tab bar over a divider on every screen (spare width shared, tight padding
          so five Japanese labels fit a 360px screen). */}
      <ul className="flex border-b border-ink/10 text-sm font-bold">
        {ITEMS.map(({ href, key, match }) => (
          <li key={key} className="flex-auto">
            <Link
              href={href}
              aria-current={match(pathname) ? "page" : undefined}
              className="-mb-px block border-b-2 border-transparent px-1 py-2.5 text-center whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-dex-red aria-[current=page]:text-ink"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
