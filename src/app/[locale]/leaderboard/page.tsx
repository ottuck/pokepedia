import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { MyRank } from "@/features/leaderboard/components/my-rank";
import { getLeaderboard } from "@/features/leaderboard/queries";

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
  const [t, format, rows] = await Promise.all([
    getTranslations("leaderboard"),
    getFormatter(),
    getLeaderboard(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16">
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
                <td className="truncate px-2 py-3 font-bold">{row.nickname}</td>
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
