import { getTranslations } from "next-intl/server";

/** Rights notice on every page: the site shows Pokémon names and artwork it does not own. */
export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl px-4 pt-8 pb-10">
      <p className="border-t border-ink/10 pt-6 text-xs leading-relaxed text-muted">
        {t("notice")}
      </p>
    </footer>
  );
}
