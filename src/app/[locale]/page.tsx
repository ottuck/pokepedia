import { getLocale, getTranslations } from "next-intl/server";
import { PokemonGrid } from "@/features/pokemon/components/pokemon-grid";
import { getPokedexList } from "@/features/pokemon/queries";

// Prerendered per locale at build time: the catalog only changes when the sync script runs,
// and every deploy rebuilds it.
export default async function PokedexPage() {
  const [locale, t, pokemon] = await Promise.all([
    getLocale(),
    getTranslations("dex"),
    getPokedexList(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted">
          {t("count", { count: pokemon.length })}
        </p>
      </div>
      <PokemonGrid pokemon={pokemon} locale={locale} />
    </main>
  );
}
