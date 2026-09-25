"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { announceAccountChange } from "@/features/auth/account-events";
import { createClient } from "@/lib/supabase/browser";
import { setAvatar, type AvatarResult } from "../actions";
import { AVATAR_BUCKET, newAvatarPath } from "../avatar";
import {
  AvatarImageFailure,
  toAvatarImage,
  type AvatarImageError,
} from "../resize";

type Props = {
  userId: string;
  nickname: string;
  /** What is shown now: the uploaded avatar, else the Google picture, else null. */
  pictureUrl: string | null;
  /** Whether an uploaded avatar exists (the reset button removes only that). */
  hasUpload: boolean;
  isGuest: boolean;
};

type Failure =
  | AvatarImageError
  | Extract<AvatarResult, { ok: false }>["code"]
  | "upload_failed";

/**
 * Profile picture on the my page. Google users pick an image: it is cropped and resized in the
 * browser, uploaded straight to their own Storage folder (policies enforce the folder and
 * refuse guests), then the server points the profile at it and removes the old file.
 */
export function AvatarEditor({
  userId,
  nickname,
  pictureUrl,
  hasUpload,
  isGuest,
}: Props) {
  const t = useTranslations("me.avatar");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  const finish = (result: AvatarResult) => {
    if (!result.ok) {
      setError(result.code);
      return;
    }
    announceAccountChange();
  };

  const upload = (file: File) =>
    startTransition(async () => {
      setError(null);
      try {
        const { blob, extension } = await toAvatarImage(file);
        const path = newAvatarPath(userId, extension);
        const { error: uploadError } = await createClient()
          .storage.from(AVATAR_BUCKET)
          .upload(path, blob, { contentType: blob.type });
        if (uploadError) {
          setError("upload_failed");
          return;
        }
        finish(await setAvatar(path));
      } catch (caught) {
        setError(
          caught instanceof AvatarImageFailure ? caught.code : "upload_failed",
        );
      }
    });

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dex-red text-3xl font-black text-white ring-4 ring-card">
        {pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google pictures are not in next/image remotePatterns
          <img
            src={pictureUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden>{nickname.slice(0, 1).toUpperCase()}</span>
        )}
      </span>

      {isGuest ? (
        <p className="text-sm text-muted">{t("googleOnly")}</p>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => input.current?.click()}
              className="rounded-full bg-ink/5 px-3 py-1 text-sm font-bold hover:bg-ink/10 disabled:opacity-50"
            >
              {pending ? t("uploading") : t("change")}
            </button>
            {hasUpload && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    finish(await setAvatar(null));
                  })
                }
                className="rounded-full px-3 py-1 text-sm font-bold text-muted hover:text-ink disabled:opacity-50"
              >
                {t("reset")}
              </button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            aria-label={t("change")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) upload(file);
            }}
          />
          <p
            role={error ? "alert" : undefined}
            className={`text-xs ${error ? "font-bold text-danger" : "text-muted"}`}
          >
            {error ? t(`errors.${error}`) : t("help")}
          </p>
        </div>
      )}
    </div>
  );
}
