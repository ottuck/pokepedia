import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokepedia",
  description: "Gen 1 Pokédex, silhouette quiz, and sticker collection.",
};

// Replaced by app/[locale]/layout.tsx once i18n routing lands.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
