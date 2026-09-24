import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-black text-dex-red">404</p>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface"
      >
        {t("backHome")}
      </Link>
    </main>
  );
}
