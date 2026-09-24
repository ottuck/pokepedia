import Image from "next/image";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artworkUrl } from "../../assets";
import type { Evolution, EvolutionStage } from "../../evolution";
import { formatDexNumber, localizedName } from "../../format";
import type { PokedexEntry } from "../../queries";
import { typeStyle } from "../../types";

type Props = {
  stages: EvolutionStage<PokedexEntry>[];
  currentId: number;
  locale: Locale;
};

export function EvolutionLine({ stages, currentId, locale }: Props) {
  const t = useTranslations("detail");

  if (stages.length === 1) {
    return <p className="text-muted">{t("noEvolution")}</p>;
  }

  return (
    <ol className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
      {stages.map((stage, stageIndex) => (
        <li
          key={stage[0].member.id}
          className="flex flex-wrap justify-center gap-3 sm:flex-col"
        >
          {stage.map(({ member, evolution }) => (
            <div
              key={member.id}
              className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3"
            >
              {stageIndex > 0 && (
                <EvolutionCondition evolution={evolution} locale={locale} />
              )}
              <EvolutionMember
                entry={member}
                locale={locale}
                isCurrent={member.id === currentId}
              />
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

function EvolutionCondition({
  evolution,
  locale,
}: {
  evolution: Evolution | null;
  locale: Locale;
}) {
  const t = useTranslations("detail");
  let label = t("evolutionOther");
  if (evolution?.trigger === "level-up" && evolution.minLevel !== undefined) {
    label = t("evolutionLevel", { level: evolution.minLevel });
  } else if (evolution?.trigger === "use-item" && evolution.item) {
    label = evolution.item[locale];
  } else if (evolution?.trigger === "trade") {
    label = t("evolutionTrade");
  }

  return (
    <span className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-muted">
      <span aria-hidden className="sm:hidden">
        ↓
      </span>
      {label}
      <span aria-hidden className="hidden sm:inline">
        →
      </span>
    </span>
  );
}

function EvolutionMember({
  entry,
  locale,
  isCurrent,
}: {
  entry: PokedexEntry;
  locale: Locale;
  isCurrent: boolean;
}) {
  const name = localizedName(entry, locale);

  return (
    <Link
      href={`/pokemon/${entry.id}`}
      aria-current={isCurrent ? "page" : undefined}
      style={typeStyle(entry.type_1, entry.type_2)}
      className="group flex w-28 flex-col items-center rounded-2xl border-2 border-transparent p-2 text-center transition-colors hover:border-(--type) aria-[current=page]:border-(--type) aria-[current=page]:bg-(--type-soft)"
    >
      <div className="relative size-20">
        <Image
          src={artworkUrl(entry.artwork_path)}
          alt=""
          fill
          sizes="80px"
          className="object-contain transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
        />
      </div>
      <span className="font-mono text-[11px] text-(--type-ink)">
        {formatDexNumber(entry.id)}
      </span>
      <span className="text-sm font-bold">{name}</span>
    </Link>
  );
}
