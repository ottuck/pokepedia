import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/public";

/**
 * Refreshes the Supabase session on `response` (the i18n response built for this request),
 * so Server Components see a valid token and the browser receives the rotated cookies.
 *
 * This is a session refresh, not authorization: pages and actions must still verify the
 * user themselves (getClaims) and RLS remains the final guard.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
          // Responses carrying auth cookies must not be cached by a CDN.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Verifies the JWT and refreshes it when expired. Do not put code between client creation
  // and this call, or sessions can end unexpectedly.
  await supabase.auth.getClaims();

  return response;
}
