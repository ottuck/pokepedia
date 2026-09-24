import { hasLocale, type Locale } from "next-intl";
import { routing } from "@/i18n/routing";

/**
 * Where to send the user after the OAuth round trip. Only same-origin paths are allowed:
 * a bare `startsWith("/")` check would let "//evil.example" (protocol-relative) or
 * "/\evil.example" (browsers read "\" as "/") turn the login into an open redirect.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/";
  }
  // Control characters (tabs/newlines are stripped by URL parsers) could smuggle the above.
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}

/** The locale a path like "/ja/pokemon/25" belongs to, for pages shown after a redirect. */
export function localeFromPath(path: string): Locale {
  const segment = path.split("/")[1];
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
}
