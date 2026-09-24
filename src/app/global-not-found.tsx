import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 · Pokepedia",
};

// Rendered outside any [locale] layout, so it cannot use translations.
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-6xl font-black text-dex-red">404</p>
        <p className="text-muted">
          페이지를 찾을 수 없어요 · Page not found · ページが見つかりません
        </p>
        <Link
          href="/"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface"
        >
          Pokepedia
        </Link>
      </body>
    </html>
  );
}
