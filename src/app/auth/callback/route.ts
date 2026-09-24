import { NextResponse, type NextRequest } from "next/server";
import { localeFromPath, safeNextPath } from "@/features/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase sends the browser here after Google sign-in or account linking (PKCE flow).
 * Lives outside [locale] and is excluded from the proxy: it only exchanges the one-time code
 * for a session cookie and forwards to `next`.
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

  return NextResponse.redirect(new URL(next, origin));
}
