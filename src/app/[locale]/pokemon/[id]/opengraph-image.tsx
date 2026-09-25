import { ImageResponse } from "next/og";
import { hasLocale, type Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { artworkUrl } from "@/features/pokemon/assets";
import { formatDexNumber, localizedName } from "@/features/pokemon/format";
import { getPokedexList, getPokemonDetail } from "@/features/pokemon/queries";
import { TYPE_COLORS } from "@/features/pokemon/types";
import { createPublicClient } from "@/lib/supabase/public";
import { artworkAsPng } from "@/lib/og/artwork";
import { loadGoogleFont } from "@/lib/og/font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pokepedia";

// One image per prerendered page (151 × 3), made at build time like the pages themselves.
export const dynamicParams = false;

// Unlike the page, a metadata image route does not receive `locale` from the layout's
// generateStaticParams, so it lists every locale × id itself (without it the build
// prerenders nothing and dynamicParams = false turns every image into a 404).
export async function generateStaticParams() {
  const list = await getPokedexList();
  return routing.locales.flatMap((locale) =>
    list.map(({ id }) => ({ locale, id: String(id) })),
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [pokemon, types] = await Promise.all([
    getPokemonDetail(Number(id)),
    getTranslations({ locale, namespace: "types" }),
  ]);
  if (!pokemon) notFound();

  const name = localizedName(pokemon, locale);
  const genus = pokemon[`genus_${locale}`];
  const typing = [pokemon.type_1, pokemon.type_2].filter((t) => t !== null);
  const primary = TYPE_COLORS[pokemon.type_1];
  const secondary = TYPE_COLORS[pokemon.type_2 ?? pokemon.type_1];
  const typeNames = typing.map((type) => types(type));

  // Every glyph any image of this locale can draw, so all 151 share one font download.
  const text = await localeGlyphs(locale);
  const family = locale === "ja" ? "Noto Sans JP" : "Noto Sans KR";
  const [black, bold, artwork] = await Promise.all([
    loadGoogleFont(family, 900, text),
    loadGoogleFont(family, 700, text),
    artworkAsPng(artworkUrl(pokemon.artwork_path)),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 72px",
        gap: 56,
        background: `linear-gradient(135deg, ${primary.base}, ${primary.soft} 55%, ${secondary.base})`,
        fontFamily: family,
        color: "#1f1d1a",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 480,
          height: 480,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.55)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={artwork} width={430} height={430} alt="" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: primary.ink,
          }}
        >
          {formatDexNumber(pokemon.id)}
        </div>
        <div
          style={{
            fontSize: nameSize(name),
            fontWeight: 900,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 12 }}>
          {genus}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
          {typing.map((type, index) => (
            <div
              key={type}
              style={{
                display: "flex",
                padding: "8px 28px",
                borderRadius: 9999,
                fontSize: 34,
                fontWeight: 700,
                background: TYPE_COLORS[type].soft,
                color: TYPE_COLORS[type].ink,
                border: `4px solid ${TYPE_COLORS[type].base}`,
              }}
            >
              {typeNames[index]}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 32,
            fontWeight: 900,
            color: "#d8433a",
          }}
        >
          Pokepedia
        </div>
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

/** The text column is about 520px wide: long names (Kangaskhan, フシギバナ) step down. */
function nameSize(name: string): number {
  if (name.length <= 4) return 120;
  if (name.length <= 6) return 100;
  if (name.length <= 8) return 84;
  return 68;
}

const glyphs = new Map<Locale, Promise<string>>();

/** Names, categories and type names of the whole dex in one locale, plus digits and brand. */
function localeGlyphs(locale: Locale): Promise<string> {
  let text = glyphs.get(locale);
  if (!text) {
    text = (async () => {
      const [{ data, error }, types] = await Promise.all([
        createPublicClient()
          .from("pokemon")
          .select(`name_${locale}, genus_${locale}`)
          .returns<Record<string, string>[]>(),
        getTranslations({ locale, namespace: "types" }),
      ]);
      if (error) throw new Error(`Failed to load OG glyphs: ${error.message}`);
      const typeNames = Object.keys(TYPE_COLORS).map((type) =>
        types(type as keyof typeof TYPE_COLORS),
      );
      return [
        ...data.flatMap(Object.values),
        ...typeNames,
        "#0123456789Pokepedia",
      ].join("");
    })();
    text.catch(() => glyphs.delete(locale));
    glyphs.set(locale, text);
  }
  return text;
}
