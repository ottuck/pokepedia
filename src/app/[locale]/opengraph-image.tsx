import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { artworkUrl } from "@/features/pokemon/assets";
import { getPokedexList } from "@/features/pokemon/queries";
import { artworkAsPng } from "@/lib/og/artwork";
import { loadGoogleFont } from "@/lib/og/font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pokepedia";

/** The Gen 1 starters and Pikachu: the dex at a glance. */
const FEATURED = [1, 4, 7, 25];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Default preview for every page in the locale; detail pages have their own.
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [t, list] = await Promise.all([
    getTranslations({ locale, namespace: "metadata" }),
    getPokedexList(),
  ]);
  const tagline = t("description");
  const family = locale === "ja" ? "Noto Sans JP" : "Noto Sans KR";
  const featured = list.filter((pokemon) => FEATURED.includes(pokemon.id));

  const [black, bold, ...artworks] = await Promise.all([
    loadGoogleFont(family, 900, "Pokepedia"),
    loadGoogleFont(family, 700, tagline),
    ...featured.map((pokemon) =>
      artworkAsPng(artworkUrl(pokemon.artwork_path)),
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #fffdf7, #a9cbff)",
        fontFamily: family,
        color: "#1f1d1a",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {artworks.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
          <img key={index} src={src} width={220} height={220} alt="" />
        ))}
      </div>
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: "#d8433a",
          lineHeight: 1,
          marginTop: 24,
        }}
      >
        Pokepedia
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, marginTop: 20 }}>
        {tagline}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: family, data: bold, weight: 700, style: "normal" },
        { name: family, data: black, weight: 900, style: "normal" },
      ],
    },
  );
}
