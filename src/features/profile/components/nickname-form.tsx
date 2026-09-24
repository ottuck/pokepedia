"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { announceAccountChange } from "@/features/auth/account-events";
import { renameMe, type RenameResult } from "../actions";
import { NICKNAME_MAX, NICKNAME_MIN } from "../nickname";

type Failure = Extract<RenameResult, { ok: false }>["code"];

/** The page heading doubles as the rename control: the nickname, or a form while editing. */
export function NicknameForm({ nickname }: { nickname: string }) {
  const t = useTranslations("me.nickname");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight break-all">
          {nickname}
        </h1>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing(true);
          }}
          className="rounded-full bg-ink/5 px-3 py-1 text-sm font-bold hover:bg-ink/10"
        >
          {t("edit")}
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await renameMe(formData.get("nickname"));
          if (!result.ok) {
            setError(result.code);
            return;
          }
          announceAccountChange();
          setEditing(false);
        })
      }
      className="flex flex-col gap-2"
    >
      <label htmlFor="nickname" className="text-sm font-bold">
        {t("label")}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="nickname"
          name="nickname"
          defaultValue={nickname}
          required
          minLength={NICKNAME_MIN}
          maxLength={NICKNAME_MAX}
          autoFocus
          autoComplete="nickname"
          aria-invalid={error ? true : undefined}
          aria-describedby="nickname-help"
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-ink/10 bg-card px-3 text-lg font-bold focus:border-ink focus:outline-none sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-ink px-5 font-bold text-surface disabled:opacity-50"
        >
          {pending ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-11 rounded-full px-4 font-bold text-muted hover:text-ink"
        >
          {t("cancel")}
        </button>
      </div>
      <p
        id="nickname-help"
        role={error ? "alert" : undefined}
        className={`text-sm ${error ? "font-bold text-danger" : "text-muted"}`}
      >
        {error
          ? t(`errors.${error}`)
          : t("help", { min: NICKNAME_MIN, max: NICKNAME_MAX })}
      </p>
    </form>
  );
}
