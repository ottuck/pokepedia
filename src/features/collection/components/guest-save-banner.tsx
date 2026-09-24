"use client";

import { useTranslations } from "next-intl";
import { continueWithGoogle } from "@/features/auth/google";
import { useRouter } from "@/i18n/navigation";

/** Guests keep their collection only in this browser; offer to link Google. */
export function GuestSaveBanner() {
  const t = useTranslations("collection.guest");
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl bg-volt/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{t("notice")}</p>
      <button
        type="button"
        onClick={() => void continueWithGoogle(true, router)}
        className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-surface"
      >
        {t("save")}
      </button>
    </div>
  );
}
