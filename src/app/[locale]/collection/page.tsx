import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CollectionExplorer } from "@/features/collection/components/collection-explorer";
import { GuestSaveBanner } from "@/features/collection/components/guest-save-banner";
import { StickerCard } from "@/features/collection/components/sticker-card";
import { getMyCollection } from "@/features/collection/queries";
import { summarizeCollection } from "@/features/collection/summary";
import { getPokedexList } from "@/features/pokemon/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collection");
  return { title: `${t("title")} · Pokepedia` };
}

// Rendered per request: the page reads the session cookie (see getMyCollection).
export default async function CollectionPage({
  searchParams,
}: PageProps<"/[locale]/collection">) {
  const [locale, t, pokedex, mine] = await Promise.all([
    getLocale(),
    getTranslations("collection"),
    getPokedexList(),
    getMyCollection(),
  ]);
  // Set by the auth callback after a guest record was merged into this account.
  const merged = (await searchParams).merged === "1";
  const summary = summarizeCollection(mine.stickers);
  const total = pokedex.length;

  const cards = Object.fromEntries(
    pokedex.map((pokemon) => [
      pokemon.id,
      <StickerCard
        key={pokemon.id}
        pokemon={pokemon}
        holding={summary.byPokemon.get(pokemon.id)}
        locale={locale}
      />,
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <h1 className="mb-4 text-3xl font-black tracking-tight">{t("title")}</h1>

      <section
        aria-label={t("progressLabel")}
        className="mb-6 grid gap-3 sm:grid-cols-2"
      >
        <Progress
          label={t("collected")}
          value={summary.collected}
          total={total}
          tone="bg-dex-red"
        />
        <Progress
          label={t("shiny")}
          value={summary.shinyCollected}
          total={total}
          tone="bg-volt"
        />
      </section>

      {merged && (
        <p
          role="status"
          className="mb-6 rounded-2xl bg-volt/20 p-4 text-sm font-bold"
        >
          {t("merged")}
        </p>
      )}
      {mine.isAnonymous && <GuestSaveBanner className="mb-6" />}

      {summary.collected === 0 && (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center ring-1 ring-ink/5">
          <p className="text-lg font-bold">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("emptyBody")}</p>
          <Link
            href="/quiz"
            className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-surface"
          >
            {t("toQuiz")}
          </Link>
        </div>
      )}

      <CollectionExplorer
        ids={pokedex.map((p) => p.id)}
        holdings={Object.fromEntries(summary.byPokemon)}
        cards={cards}
      />
    </main>
  );
}

function Progress({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-ink/5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className="font-mono text-lg font-black">
          {value} <span className="text-sm text-muted">/ {total}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        className="h-3 overflow-hidden rounded-full bg-ink/5"
      >
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${(value / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
