import type { Locale } from "next-intl";
import type { PokedexEntry } from "../queries";
import { PokemonCard } from "./pokemon-card";

// Roughly the first two rows on a desktop screen.
const EAGER_CARDS = 12;

export function PokemonGrid({
  pokemon,
  locale,
}: {
  pokemon: PokedexEntry[];
  locale: Locale;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {pokemon.map((entry, index) => (
        <li key={entry.id}>
          <PokemonCard
            pokemon={entry}
            locale={locale}
            eager={index < EAGER_CARDS}
          />
        </li>
      ))}
    </ul>
  );
}
