import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { MyRank } from "@/features/leaderboard/components/my-rank";
import { getLeaderboard } from "@/features/leaderboard/queries";
import { artworkUrl } from "@/features/pokemon/assets";
import { getPokedexList } from "@/features/pokemon/queries";
import { trainerName } from "@/features/profile/display";

// Rankings change as games finish; a minute of staleness keeps the page cached and cheap.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboard");
  return { title: `${t("title")} · Pokepedia`, description: t("subtitle") };
}

/** Medal colours appear only as the ring around a podium avatar. */
const MEDAL_RING: Record<number, string> = {
  1: "ring-volt",
  2: "ring-ink/25",
  3: "ring-[#c08457]",
};
const MEDAL_TEXT: Record<number, string> = {
  1: "text-[#b8860b]",
  2: "text-muted",
  3: "text-[#a0663a]",
};

type Entry = NonNullable<Awaited<ReturnType<typeof getLeaderboard>>>[number];

export default async function LeaderboardPage() {
  const locale = await getLocale();
  const [t, format, rows, pokedex] = await Promise.all([
    getTranslations("leaderboard"),
    getFormatter(),
    getLeaderboard(locale),
    // Only the icons need it: without the list the ranking still shows, names only.
    getPokedexList().catch(() => []),
  ]);
  // Each player's profile Pokémon next to the name; uploaded pictures stay off the ranking.
  const artwork = new Map(pokedex.map((p) => [p.id, p.artwork_path]));

  const Avatar = ({
    entry,
    className,
  }: {
    entry: Entry;
    className: string;
  }) => {
    const path =
      entry.avatar_pokemon_id === null
        ? undefined
        : artwork.get(entry.avatar_pokemon_id);
    return (
      <span
        className={`relative block shrink-0 rounded-full border border-ink/10 bg-card ${className}`}
      >
        {path && (
          <Image
            src={artworkUrl(path)}
            alt=""
            fill
            sizes="80px"
            className="object-contain p-[12%]"
          />
        )}
      </span>
    );
  };
  const name = (entry: Entry) =>
    trainerName(entry.nickname, entry.adjective, entry.pokemon_name);
  const combo = (entry: Entry) => `${t("bestCombo")} ×${entry.best_combo}`;

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 pb-16">
      <header>
        <h1 className="text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      <MyRank />

      {rows === null ? (
        <p
          role="status"
          className="rounded-2xl bg-card p-8 text-center text-muted ring-1 ring-ink/5"
        >
          {t("unavailable")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted ring-1 ring-ink/5">
          {t("empty")}
        </p>
      ) : (
        <section aria-label={t("title")} className="flex flex-col gap-3">
          {/* Top three: 2nd, 1st, 3rd side by side, the first a step higher. */}
          <ol className="grid grid-cols-3 items-end gap-2 sm:gap-3">
            {podium.map((entry, index) => (
              <li
                key={index}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-card px-2 text-center ring-1 ring-ink/5 ${index === 0 ? "order-2 pt-5 pb-6" : index === 1 ? "order-1 pt-4 pb-4" : "order-3 pt-4 pb-4"}`}
              >
                <span
                  className={`font-mono text-xs font-black tabular-nums ${MEDAL_TEXT[entry.rank] ?? "text-muted"}`}
                >
                  {entry.rank}
                </span>
                <Avatar
                  entry={entry}
                  className={`ring-2 ring-offset-2 ring-offset-card ${MEDAL_RING[entry.rank] ?? "ring-transparent"} ${index === 0 ? "size-18" : "size-14"}`}
                />
                <span className="mt-1 w-full truncate text-sm font-bold">
                  {name(entry)}
                </span>
                <span className="font-mono text-lg leading-none font-black tabular-nums">
                  <span className="sr-only">{t("score")} </span>
                  {format.number(entry.score)}
                </span>
                <span className="text-[11px] text-muted">{combo(entry)}</span>
              </li>
            ))}
          </ol>

          {rest.length > 0 && (
            <ol className="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-card ring-1 ring-ink/5">
              {rest.map((entry, index) => (
                <li key={index} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-right font-mono text-sm text-muted tabular-nums">
                    {entry.rank}
                  </span>
                  <Avatar entry={entry} className="size-9" />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {name(entry)}
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-mono font-black tabular-nums">
                      <span className="sr-only">{t("score")} </span>
                      {format.number(entry.score)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {combo(entry)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
