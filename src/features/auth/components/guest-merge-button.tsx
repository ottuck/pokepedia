"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { prepareGuestMerge, type PrepareMergeResult } from "../actions";
import { continueWithGoogle } from "../google";

type Failure = Extract<PrepareMergeResult, { ok: false }>["code"];

/**
 * Shown when "save with Google" found the Google account already in use: issue a merge
 * ticket as the guest, then sign in to that account. The auth callback moves the record over
 * and lands on the collection, where the merged stickers are.
 */
export function GuestMergeButton() {
  const t = useTranslations("auth.merge");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await prepareGuestMerge();
            if (!result.ok) {
              setError(result.code);
              return;
            }
            await continueWithGoogle(false, router, `/${locale}/collection`);
          })
        }
        className="rounded-full bg-ink px-5 py-2.5 font-bold text-surface disabled:opacity-50"
      >
        {pending ? t("preparing") : t("button")}
      </button>
      <p className="max-w-sm text-xs text-muted">{t("note")}</p>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
