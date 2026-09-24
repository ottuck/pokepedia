import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const KNOWN_ERRORS = {
  identity_already_exists: "identityAlreadyExists",
  access_denied: "accessDenied",
} as const;

// Reads searchParams, so this is rendered per request (the only dynamic page so far).
export default async function AuthErrorPage({
  searchParams,
}: PageProps<"/[locale]/auth/error">) {
  const { code } = await searchParams;
  const t = await getTranslations("auth.errors");
  const key =
    typeof code === "string" && code in KNOWN_ERRORS
      ? KNOWN_ERRORS[code as keyof typeof KNOWN_ERRORS]
      : "generic";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 pb-16 text-center">
      <h1 className="text-2xl font-black">{t("title")}</h1>
      <p className="text-muted">{t(key)}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface"
      >
        {t("backHome")}
      </Link>
    </main>
  );
}
