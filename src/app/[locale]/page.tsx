import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <>
      <header className="flex justify-end p-4">
        <LocaleSwitcher />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="rounded-full bg-dex-red px-3 py-1 text-sm font-medium text-white">
          {t("badge")}
        </p>
        <h1 className="text-5xl font-black tracking-tight">Pokepedia</h1>
        <p className="text-muted">{t("tagline")}</p>
      </main>
    </>
  );
}
