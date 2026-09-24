"use client";

import { useTranslations } from "next-intl";
import { useQuizStore } from "../store";

const KNOWN = [
  "sign_in_failed",
  "conflict",
  "no_skips_left",
  "hint_already_used",
] as const;

export function ErrorNotice() {
  const t = useTranslations("quiz.errors");
  const error = useQuizStore((s) => s.error);
  if (!error) return null;

  const key = (KNOWN as readonly string[]).includes(error)
    ? (error as (typeof KNOWN)[number])
    : "generic";
  return (
    <p
      role="alert"
      className="rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-dex-red"
    >
      {t(key)}
    </p>
  );
}
