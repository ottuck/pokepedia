"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuizStore } from "../store";
import { ErrorNotice } from "./error-notice";

const RULES = ["fight", "item", "pokemon", "run"] as const;

export function Lobby() {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const start = useQuizStore((s) => s.start);
  const starting = phase === "starting";

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-10 text-center sm:px-10">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="max-w-md text-sm text-ink/70">{t("subtitle")}</p>

      <dl className="grid w-full max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {RULES.map((rule) => (
          <div key={rule} className="rounded-2xl bg-white/70 p-4">
            <dt className="font-bold">{t(`rules.${rule}.title`)}</dt>
            <dd className="mt-1 text-sm text-ink/70">
              {t(`rules.${rule}.body`)}
            </dd>
          </div>
        ))}
      </dl>

      <ErrorNotice />

      <button
        type="button"
        onClick={() => void start(locale)}
        disabled={starting}
        className="rounded-full bg-ink px-10 py-3 text-lg font-black text-white shadow-lg transition hover:scale-105 disabled:opacity-60 motion-reduce:transition-none"
      >
        {starting ? t("starting") : t("play")}
      </button>
    </div>
  );
}
