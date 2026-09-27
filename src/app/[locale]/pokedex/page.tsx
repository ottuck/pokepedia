import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PokedexExplorer } from "@/features/pokemon/components/pokedex-explorer";
import { PokemonCard } from "@/features/pokemon/components/pokemon-card";
import { getPokedexList } from "@/features/pokemon/queries";

// Roughly the first two rows on a desktop screen load eagerly; the rest are lazy.
const EAGER_CARDS = 12;

// Prerendered per locale at build time: the catalog only changes when the sync script runs,
// and every deploy rebuilds it.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dex");
  return { title: `${t("title")} · Pokepedia` };
}

export default async function PokedexPage() {
  const [locale, t, pokemon] = await Promise.all([
    getLocale(),
    getTranslations("dex"),
    getPokedexList(),
  ]);

  // Server-rendered cards handed to the client explorer, which only filters and reorders them.
  const cards = Object.fromEntries(
    pokemon.map((entry, index) => [
      entry.id,
      <PokemonCard
        key={entry.id}
        pokemon={entry}
        locale={locale}
        eager={index < EAGER_CARDS}
      />,
    ]),
  );
  const entries = pokemon.map(
    ({ id, name_ko, name_en, name_ja, type_1, type_2 }) => ({
      id,
      name_ko,
      name_en,
      name_ja,
      type_1,
      type_2,
    }),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted">
          {t("count", { count: pokemon.length })}
        </p>
      </div>
      <PokedexExplorer entries={entries} cards={cards} />
    </main>
  );
}
