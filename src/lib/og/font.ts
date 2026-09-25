import "server-only";
import { createRetryingFetch } from "@/lib/supabase/retrying-fetch";

type OgFamily = "Noto Sans KR" | "Noto Sans JP";

const retryingFetch = createRetryingFetch();
/** One download per family, weight and glyph set for the whole build worker. */
const fonts = new Map<string, Promise<ArrayBuffer>>();

/**
 * A Google font subset containing only `text`, for next/og. ImageResponse cannot read woff2
 * (our bundled pixel font), and Korean/Japanese names need CJK glyphs. Callers pass the text
 * of a whole locale (every name, category and type) so hundreds of OG images share a handful
 * of downloads instead of making two each. Runs at build time, like next/font/google.
 */
export function loadGoogleFont(
  family: OgFamily,
  weight: 700 | 900,
  text: string,
): Promise<ArrayBuffer> {
  const glyphs = [...new Set(text)].sort().join("");
  const key = `${family}:${weight}:${glyphs}`;
  let font = fonts.get(key);
  if (!font) {
    font = download(family, weight, glyphs);
    // A failed download should not be cached: the next image tries again.
    font.catch(() => fonts.delete(key));
    fonts.set(key, font);
  }
  return font;
}

async function download(family: OgFamily, weight: number, glyphs: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(glyphs)}`;
  // Without a browser User-Agent, Google serves TrueType, which ImageResponse can parse.
  const css = await (await retryingFetch(url)).text();
  const source = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!source) throw new Error(`No TrueType source for ${family} ${weight}`);
  const response = await retryingFetch(source[1]);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  return response.arrayBuffer();
}
