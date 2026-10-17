import Image from "next/image";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { Tilt } from "@/components/tilt";
import { Link } from "@/i18n/navigation";
import { BATTLE_PLAYABLE_IDS } from "@/features/battle/host";
import { artworkUrl } from "@/features/pokemon/assets";
import { formatDexNumber, localizedName } from "@/features/pokemon/format";
import type { PokedexEntry } from "@/features/pokemon/queries";
import { typeStyle } from "@/features/pokemon/types";
import type { Holding } from "../summary";

type Props = {
  pokemon: PokedexEntry;
  holding: Holding | undefined;
  locale: Locale;
};

// A metallic gold border for stickers the battle game can use, drawn as a border-box gradient
// so the card keeps the same size as the others (the shiny frame is the flat volt yellow).
const BATTLE_FRAME =
  "linear-gradient(var(--color-card), var(--color-card)) padding-box, linear-gradient(135deg, #fde68a, #d97706 40%, #fff7c2 55%, #b45309) border-box";

/**
 * A 띠부씰 (sticker) in the legacy layout: name and number on top, artwork, the little
 * Poké Ball and "Pokémon" mark at the bottom. Missing ones are a "?" card with the number,
 * like the legacy empty slots. Owning a shiny shows the shiny art in a volt frame; a sticker
 * the battle game can use gets a gold frame and a "battle" badge that opens the game.
 */
export function StickerCard({ pokemon, holding, locale }: Props) {
  const t = useTranslations("collection");
  const number = formatDexNumber(pokemon.id);

  if (!holding) {
    return (
      <Link
        href={`/pokemon/${pokemon.id}`}
        className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 bg-ink/[0.03] text-muted transition-colors hover:border-ink/30"
      >
        <span aria-hidden className="text-3xl font-black text-ink/15">
          ?
        </span>
        <span className="font-mono text-xs">{number}</span>
        <span className="sr-only">{t("missing")}</span>
      </Link>
    );
  }

  const name = localizedName(pokemon, locale);
  const shiny = holding.shiny > 0;
  const battle = BATTLE_PLAYABLE_IDS.includes(pokemon.id);

  return (
    <Tilt holo={shiny} className="rounded-2xl">
      <Link
        href={`/pokemon/${pokemon.id}`}
        style={{
          ...typeStyle(pokemon.type_1, pokemon.type_2),
          ...(battle ? { background: BATTLE_FRAME } : {}),
        }}
        className={`group relative flex aspect-[3/4] flex-col rounded-2xl border-4 bg-card p-2 shadow-sm ${
          battle
            ? "border-transparent shadow-lg shadow-amber-500/40"
            : shiny
              ? "border-volt shadow-volt/40"
              : "border-card ring-1 ring-ink/10"
        }`}
      >
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-xs font-black">{name}</span>
          <span className="font-mono text-[10px] text-muted">{number}</span>
        </div>

        <div className="relative my-1 flex-1 rounded-xl bg-(--type-soft)">
          <Image
            src={artworkUrl(
              shiny ? pokemon.shiny_artwork_path : pokemon.artwork_path,
            )}
            alt=""
            fill
            sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 30vw"
            className="object-contain p-1 drop-shadow"
          />
          {shiny && (
            <span className="absolute top-1 left-1 rounded-full bg-volt px-1.5 text-[10px] font-black">
              ✦ {t("shinyBadge")}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="relative size-2.5 overflow-hidden rounded-full border border-ink/60"
            >
              <span className="absolute inset-x-0 top-0 h-1/2 bg-dex-red" />
            </span>
            Pokémon
          </span>
          <span
            aria-label={t("quantity", {
              normal: holding.normal,
              shiny: holding.shiny,
            })}
          >
            ×{holding.normal + holding.shiny}
          </span>
        </div>
      </Link>
      {battle && (
        // A sibling of the card link (links cannot nest), over its bottom edge.
        <Link
          href="/battle"
          className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-linear-to-r from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-black whitespace-nowrap text-white shadow-md"
        >
          ⚔ {t("battle")}
        </Link>
      )}
    </Tilt>
  );
}
