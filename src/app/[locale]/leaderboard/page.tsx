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

const MEDALS: Record<number, string> = {
  1: "bg-volt text-charcoal",
  2: "bg-ink/15",
  3: "bg-dex-red/25",
};

export default async function LeaderboardPage() {
  const locale = await getLocale();
  const [t, format, rows, pokedex] = await Promise.all([
    getTranslations("leaderboard"),
    getFormatter(),
    getLeaderboard(locale),
    getPokedexList(),
  ]);
  // Each player's profile Pokémon next to the name; uploaded pictures stay off the ranking.
  const artwork = new Map(pokedex.map((p) => [p.id, p.artwork_path]));

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
        <table className="w-full table-fixed overflow-hidden rounded-2xl bg-card text-left ring-1 ring-ink/5">
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="w-16 px-4 py-3 font-bold">
                {t("rank")}
              </th>
              <th scope="col" className="px-2 py-3 font-bold">
                {t("nickname")}
              </th>
              <th scope="col" className="w-28 px-2 py-3 text-right font-bold">
                {t("score")}
              </th>
              <th
                scope="col"
                className="hidden w-28 px-4 py-3 text-right font-bold sm:table-cell"
              >
                {t("bestCombo")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full font-mono text-sm font-black ${MEDALS[row.rank] ?? ""}`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-2 py-3 font-bold">
                  <span className="flex items-center gap-2">
                    <span className="relative size-7 shrink-0 rounded-full bg-dex-screen">
                      {row.avatar_pokemon_id !== null &&
                        artwork.has(row.avatar_pokemon_id) && (
                          <Image
                            src={artworkUrl(
                              artwork.get(row.avatar_pokemon_id)!,
                            )}
                            alt=""
                            fill
                            sizes="28px"
                            className="object-contain p-0.5"
                          />
                        )}
                    </span>
                    <span className="truncate">
                      {trainerName(
                        row.nickname,
                        row.adjective,
                        row.pokemon_name,
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-3 text-right font-mono font-black tabular-nums">
                  {format.number(row.score)}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono tabular-nums sm:table-cell">
                  ×{row.best_combo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
