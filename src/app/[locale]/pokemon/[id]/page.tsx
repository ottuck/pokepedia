import type { Metadata } from "next";
import Image from "next/image";
import type { Locale } from "next-intl";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { artworkUrl } from "@/features/pokemon/assets";
import { EvolutionLine } from "@/features/pokemon/components/detail/evolution-line";
import { StatBars } from "@/features/pokemon/components/detail/stat-bars";
import { TypeBadge } from "@/features/pokemon/components/type-badge";
import { buildEvolutionStages } from "@/features/pokemon/evolution";
import { formatDexNumber, localizedName } from "@/features/pokemon/format";
import {
  getPokedexList,
  getPokemonDetail,
  type PokemonDetail,
} from "@/features/pokemon/queries";
import { typeStyle } from "@/features/pokemon/types";

// Only the 151 generated pages exist; any other id is a 404 without touching the database.
export const dynamicParams = false;

export async function generateStaticParams() {
  const list = await getPokedexList();
  return list.map(({ id }) => ({ id: String(id) }));
}

async function loadPokemon(
  params: PageProps<"/[locale]/pokemon/[id]">["params"],
) {
  const { id } = await params;
  const pokemon = await getPokemonDetail(Number(id));
  if (!pokemon) notFound();
  return pokemon;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pokemon/[id]">): Promise<Metadata> {
  const [pokemon, locale] = await Promise.all([
    loadPokemon(params),
    getLocale(),
  ]);
  const name = localizedName(pokemon, locale);
  const description = pokemon[`description_${locale}`];
  const image = artworkUrl(pokemon.artwork_path);

  return {
    title: `${name} ${formatDexNumber(pokemon.id)} · Pokepedia`,
    description,
    openGraph: {
      title: name,
      description,
      images: [{ url: image, width: 475, height: 475 }],
    },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/pokemon/${pokemon.id}`]),
      ),
    },
  };
}

export default async function PokemonDetailPage({
  params,
}: PageProps<"/[locale]/pokemon/[id]">) {
  const [pokemon, locale, list, t, format] = await Promise.all([
    loadPokemon(params),
    getLocale(),
    getPokedexList(),
    getTranslations("detail"),
    getFormatter(),
  ]);

  const name = localizedName(pokemon, locale);
  const otherNames = routing.locales
    .filter((l) => l !== locale)
    .map((l) => localizedName(pokemon, l));
  const index = list.findIndex((entry) => entry.id === pokemon.id);
  const previous = list[index - 1];
  const next = list[index + 1];
  const stages = buildEvolutionStages(list, pokemon.id);

  return (
    <main
      style={typeStyle(pokemon.type_1, pokemon.type_2)}
      className="mx-auto w-full max-w-5xl px-4 pb-16"
    >
      <Link
        href="/"
        className="mb-4 inline-block text-sm font-medium text-muted hover:text-ink"
      >
        ← {t("backToDex")}
      </Link>

      <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-ink/5 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Type-colored backdrop: the legacy detail page's signature gradient. */}
        {/* The gradient fills the whole column; the artwork stays a square pinned at the top,
            so a long info column does not blow the image up. */}
        <div className="bg-linear-to-br from-(--type) via-(--type-soft) to-(--type-2)">
          <div className="relative flex aspect-square items-center justify-center md:sticky md:top-0">
            <div
              aria-hidden
              className="absolute size-3/4 rounded-full bg-white/40"
            />
            <div className="relative size-4/5">
              <Image
                src={artworkUrl(pokemon.artwork_path)}
                alt={name}
                fill
                preload
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 40vw, 90vw"
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 md:p-8">
          <header>
            <p className="font-mono text-sm font-bold text-(--type-ink)">
              {formatDexNumber(pokemon.id)}
            </p>
            <h1 className="text-4xl font-black tracking-tight">{name}</h1>
            <p className="mt-1 text-sm text-muted">
              {pokemon[`genus_${locale}`]} ·{" "}
              <span lang="und">{otherNames.join(" · ")}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <TypeBadge type={pokemon.type_1} />
              {pokemon.type_2 && <TypeBadge type={pokemon.type_2} />}
              {(pokemon.is_legendary || pokemon.is_mythical) && (
                <span className="rounded-full bg-volt/30 px-2 py-0.5 text-xs font-semibold">
                  ★ {t(pokemon.is_mythical ? "mythical" : "legendary")}
                </span>
              )}
            </div>
          </header>

          <p className="leading-relaxed">{pokemon[`description_${locale}`]}</p>

          <dl className="grid grid-cols-2 gap-3">
            <Measure
              label={t("height")}
              value={format.number(pokemon.height_dm / 10, {
                style: "unit",
                unit: "meter",
              })}
            />
            <Measure
              label={t("weight")}
              value={format.number(pokemon.weight_hg / 10, {
                style: "unit",
                unit: "kilogram",
              })}
            />
          </dl>

          <section>
            <h2 className="mb-2 text-sm font-bold text-muted">
              {t("abilities")}
            </h2>
            <AbilityList
              pokemon={pokemon}
              locale={locale}
              hiddenLabel={t("hiddenAbility")}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">
              {t("baseStats")}
            </h2>
            <StatBars stats={pokemon} />
          </section>
        </div>
      </article>

      <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-ink/5">
        <h2 className="mb-4 text-center text-sm font-bold text-muted">
          {t("evolution")}
        </h2>
        <EvolutionLine stages={stages} currentId={pokemon.id} locale={locale} />
      </section>

      <nav className="mt-6 grid grid-cols-2 gap-3">
        {previous ? (
          <PagerLink
            entry={previous}
            locale={locale}
            label={t("previous")}
            direction="previous"
          />
        ) : (
          <span />
        )}
        {next && (
          <PagerLink
            entry={next}
            locale={locale}
            label={t("next")}
            direction="next"
          />
        )}
      </nav>
    </main>
  );
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-(--type-soft) px-4 py-3">
      <dt className="text-xs font-semibold text-(--type-ink)">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

function AbilityList({
  pokemon,
  locale,
  hiddenLabel,
}: {
  pokemon: PokemonDetail;
  locale: Locale;
  hiddenLabel: string;
}) {
  return (
    <ul className="space-y-2">
      {pokemon.pokemon_ability.map(({ slot, is_hidden, ability }) => (
        <li key={slot} className="rounded-2xl border border-ink/10 px-4 py-3">
          <p className="font-bold">
            {ability[`name_${locale}`]}
            {is_hidden && (
              <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-muted">
                {hiddenLabel}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {ability[`description_${locale}`]}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PagerLink({
  entry,
  locale,
  label,
  direction,
}: {
  entry: { id: number; name_ko: string; name_en: string; name_ja: string };
  locale: Locale;
  label: string;
  direction: "previous" | "next";
}) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/pokemon/${entry.id}`}
      rel={isNext ? "next" : "prev"}
      className={`rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-ink/5 transition-colors hover:ring-(--type) ${isNext ? "col-start-2 text-right" : ""}`}
    >
      <span className="block text-xs text-muted">
        {isNext ? `${label} →` : `← ${label}`}
      </span>
      <span className="font-bold">
        <span className="font-mono text-sm text-muted">
          {formatDexNumber(entry.id)}
        </span>{" "}
        {localizedName(entry, locale)}
      </span>
    </Link>
  );
}
