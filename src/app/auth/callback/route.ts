import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  MERGE_COOKIE,
  mergeCookieOptions,
  redeemGuestMerge,
} from "@/features/auth/guest-merge";
import { localeFromPath, safeNextPath } from "@/features/auth/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase sends the browser here after Google sign-in or account linking (PKCE flow).
 * Lives outside [locale] and is excluded from the proxy: it exchanges the one-time code for a
 * session cookie, finishes a pending guest merge, and forwards to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const errorPage = (code: string) =>
    NextResponse.redirect(
      new URL(
        `/${localeFromPath(next)}/auth/error?code=${encodeURIComponent(code)}`,
        origin,
      ),
    );

  // A merge ticket is good for this one return from Google, whatever the outcome.
  const mergeToken = request.cookies.get(MERGE_COOKIE)?.value;
  if (mergeToken) {
    (await cookies()).delete({
      name: MERGE_COOKIE,
      path: mergeCookieOptions.path,
    });
  }

  // The provider or Supabase refused (e.g. the user cancelled, or the Google account is
  // already linked to another Pokepedia account).
  const providerError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) return errorPage(providerError);

  const code = searchParams.get("code");
  if (!code) return errorPage("missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return errorPage(error.code ?? "exchange_failed");

  if (mergeToken) {
    // Merge only into the account that just signed in, and never into another guest.
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims || claims.is_anonymous === true)
      return errorPage("merge_failed");

    const result = await redeemGuestMerge(
      createAdminClient(),
      mergeToken,
      claims.sub,
    );
    if (!result.ok) return errorPage(result.code);

    const target = new URL(next, origin);
    target.searchParams.set("merged", "1");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, origin));
}
