import Image from "next/image";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artworkUrl } from "../assets";
import { formatDexNumber, localizedName } from "../format";
import type { PokedexEntry } from "../queries";
import { typeStyle } from "../types";
import { TypeBadge } from "./type-badge";

// Must match GRID_CLASS in pokedex-explorer.tsx so the browser picks a right-sized image.
const ARTWORK_SIZES =
  "(min-width: 1280px) 180px, (min-width: 1024px) 18vw, (min-width: 768px) 23vw, (min-width: 640px) 31vw, 46vw";

type Props = {
  pokemon: PokedexEntry;
  locale: Locale;
  /** Cards visible without scrolling load eagerly; the rest stay lazy. */
  eager?: boolean;
};

export function PokemonCard({ pokemon, locale, eager = false }: Props) {
  const name = localizedName(pokemon, locale);

  return (
    <Link
      href={`/pokemon/${pokemon.id}`}
      style={typeStyle(pokemon.type_1, pokemon.type_2)}
      className="group block rounded-3xl bg-linear-to-br from-(--type) to-(--type-2) p-[3px] transition duration-300 ease-out outline-none hover:-translate-y-1 hover:shadow-[0_14px_32px_-10px_var(--type)] focus-visible:ring-4 focus-visible:ring-(--type)/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <article className="flex h-full flex-col rounded-[21px] bg-white px-3 pt-2 pb-3">
        <span className="font-mono text-xs font-bold text-(--type-ink)">
          {formatDexNumber(pokemon.id)}
        </span>

        <div className="relative my-1 aspect-square">
          <div
            aria-hidden
            className="absolute inset-[12%] rounded-full bg-(--type-soft) transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
          />
          <Image
            src={artworkUrl(pokemon.artwork_path)}
            // The name is already the link text; repeating it here would be read twice.
            alt=""
            fill
            sizes={ARTWORK_SIZES}
            loading={eager ? "eager" : "lazy"}
            className="object-contain drop-shadow-md transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-110 motion-reduce:transition-none"
          />
        </div>

        <h2 className="truncate text-center font-bold">{name}</h2>
        <div className="mt-2 flex justify-center gap-1">
          <TypeBadge type={pokemon.type_1} />
          {pokemon.type_2 && <TypeBadge type={pokemon.type_2} />}
        </div>
      </article>
    </Link>
  );
}
