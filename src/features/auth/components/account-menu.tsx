"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { placeUnder } from "@/components/anchored-popover";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import {
  NAME_COLUMNS,
  profileName,
  profilePicture,
  type ProfilePicture,
} from "@/features/profile/display";
import { createClient } from "@/lib/supabase/browser";
import { announceAccountChange, onAccountChange } from "../account-events";
import { continueWithGoogle } from "../google";

type AccountState =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      isAnonymous: boolean;
      name: string;
      picture: ProfilePicture | null;
    };

/**
 * Header account area. A client island on purpose: the header is in the root layout, and
 * reading the session cookie there would turn every prerendered page into a per-request one.
 * The session is read in the browser instead; the profile read is protected by RLS.
 */
export function AccountMenu() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const menuId = useId();
  const [account, setAccount] = useState<AccountState>({ status: "loading" });
  // A guest's sign-out asks first, inside the menu: the guest account cannot be entered again.
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let version = 0;

    async function load() {
      const request = ++version;
      const { data } = await supabase.auth.getClaims();
      if (cancelled || request !== version) return;
      const claims = data?.claims;
      if (!claims) {
        setAccount({ status: "signedOut" });
        return;
      }
      const { data: profile } = await supabase
        .from("profile")
        .select(`avatar_path, ${NAME_COLUMNS}`)
        .eq("id", claims.sub)
        .maybeSingle();
      if (cancelled || request !== version) return;
      setAccount({
        status: "signedIn",
        isAnonymous: claims.is_anonymous === true,
        name: profile ? profileName(profile, locale) : "",
        picture: profilePicture(profile, claims.user_metadata),
      });
    }

    void load();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        version++;
        if (event === "SIGNED_OUT") setAccount({ status: "signedOut" });
        // Supabase warns against awaiting its own calls inside this callback.
        setTimeout(() => {
          if (cancelled) return;
          announceAccountChange();
          // Cookies changed in the browser: personal RSC pages need a fresh render too.
          router.refresh();
        }, 0);
      }
    });
    const stopListening = onAccountChange(() => void load());
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
      stopListening();
    };
  }, [router, locale]);

  if (account.status === "loading") {
    return (
      <span
        aria-hidden
        className="size-9 animate-pulse rounded-full bg-ink/10"
      />
    );
  }

  if (account.status === "signedOut") {
    return (
      <button
        type="button"
        onClick={() => void continueWithGoogle(false, router)}
        className="flex h-9 items-center gap-2 rounded-full border-2 border-ink/10 bg-card px-3 text-sm font-semibold hover:border-ink/30"
      >
        <GoogleMark />
        <span className="sr-only sm:not-sr-only">{t("signInWithGoogle")}</span>
      </button>
    );
  }

  const { isAnonymous, name, picture } = account;

  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        onClick={(event) => {
          setConfirmingSignOut(false);
          placeUnder(event.currentTarget, menuId);
        }}
        aria-label={t("accountMenu")}
        className="flex h-9 items-center gap-2 rounded-full bg-ink/5 pr-3 pl-1 text-sm font-semibold hover:bg-ink/10"
      >
        <ProfileAvatar
          name={name}
          picture={picture}
          className="size-7 text-xs"
        />
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </button>

      <div
        id={menuId}
        popover="auto"
        className="fixed inset-auto m-0 w-64 rounded-2xl bg-card p-3 text-sm shadow-xl ring-1 ring-ink/10"
      >
        <p className="truncate px-2 font-bold">{name}</p>
        <p className="px-2 pb-2 text-xs text-muted">
          {isAnonymous ? t("guestAccount") : t("googleAccount")}
        </p>

        <Link
          href="/me"
          // Client navigation keeps the header mounted, so close the popover by hand.
          onClick={() => document.getElementById(menuId)?.hidePopover()}
          className="mb-2 block rounded-xl px-2 py-2 font-semibold hover:bg-ink/5"
        >
          {t("myPage")}
        </Link>

        {/* While a guest confirms signing out, the warning below takes this block's place. */}
        {isAnonymous && !confirmingSignOut && (
          <>
            <p className="rounded-xl bg-volt/20 p-2 text-xs">
              {t("guestNotice")}
            </p>
            <button
              type="button"
              onClick={() => void continueWithGoogle(true, router)}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 font-semibold hover:bg-ink/5"
            >
              <GoogleMark />
              {t("saveWithGoogle")}
            </button>
          </>
        )}

        {confirmingSignOut ? (
          <div
            role="alert"
            className="mt-2 rounded-xl bg-danger/10 p-3 text-xs"
          >
            <p className="font-bold text-danger">{t("guestSignOutTitle")}</p>
            <p className="mt-1">{t("guestSignOutWarning")}</p>
            <div className="mt-3 flex flex-col gap-1">
              <button
                type="button"
                autoFocus
                onClick={() => void continueWithGoogle(true, router)}
                className="flex items-center gap-2 rounded-lg bg-ink px-2 py-2 font-semibold text-surface"
              >
                <GoogleMark />
                {t("saveWithGoogle")}
              </button>
              <button
                type="button"
                onClick={() => void createClient().auth.signOut()}
                className="rounded-lg px-2 py-2 text-left font-semibold text-danger hover:bg-danger/10"
              >
                {t("signOutAnyway")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isAnonymous) setConfirmingSignOut(true);
              else void createClient().auth.signOut();
            }}
            className="mt-1 w-full rounded-xl px-2 py-2 text-left text-muted hover:bg-ink/5 hover:text-ink"
          >
            {t("signOut")}
          </button>
        )}
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-4 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
