import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { themeScript } from "@/lib/theme";
import "../globals.css";

// CJK fonts are split by unicode-range, so only the glyphs a page uses are downloaded.
const notoKr = Noto_Sans_KR({ variable: "--font-noto-kr", preload: false });
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", preload: false });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${notoKr.variable} ${notoJp.variable} h-full antialiased`}
      // themeScript sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      {/* Theme before first paint; see lib/theme.ts. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
        {/* Vercel Web Analytics (cookieless page views) and Speed Insights (Core Web Vitals).
            Both only report from Vercel deployments; locally they stay inactive. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
