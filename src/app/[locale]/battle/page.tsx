import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BattleFrame } from "@/features/battle/components/battle-frame";
import { toBattleStickers } from "@/features/battle/host";
import { getMyCollection } from "@/features/collection/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("battle");
  return { title: `${t("title")} · Pokepedia` };
}

// Rendered per request: the game gets the stickers of the player in this session.
export default async function BattlePage() {
  const [locale, t, mine] = await Promise.all([
    getLocale(),
    getTranslations("battle"),
    getMyCollection(),
  ]);

  return (
    <main className="mx-auto w-full max-w-page px-4 pb-16">
      <h1 className="mb-2 text-3xl font-black tracking-tight">{t("title")}</h1>
      <p className="mb-4 text-sm text-muted">{t("intro")}</p>
      <BattleFrame locale={locale} owned={toBattleStickers(mine.stickers)} />
      <p className="mt-3 text-center text-xs text-muted">{t("note")}</p>
    </main>
  );
}
