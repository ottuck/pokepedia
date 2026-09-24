import { useTranslations } from "next-intl";
import { typeStyle, type PokemonType } from "../types";

export function TypeBadge({ type }: { type: PokemonType }) {
  const t = useTranslations("types");

  return (
    <span
      style={typeStyle(type, null)}
      className="inline-flex items-center gap-1 rounded-full bg-(--type-soft) px-2 py-0.5 text-xs font-semibold text-(--type-ink)"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-(--type)" />
      {t(type)}
    </span>
  );
}
