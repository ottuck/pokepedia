import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
);
const isLocalSupabase = ["127.0.0.1", "localhost"].includes(
  supabaseUrl.hostname,
);

const nextConfig: NextConfig = {
  images: {
    // Only our own public Storage buckets can be optimized.
    remotePatterns: [new URL("/storage/v1/object/public/**", supabaseUrl)],
    // The image optimizer refuses private IPs (SSRF guard). Local Supabase runs on
    // 127.0.0.1, so allow it only when the app itself points at a local Supabase.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  experimental: {
    // Untranslated 404 for URLs outside any [locale] route (see app/global-not-found.tsx).
    globalNotFound: true,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
