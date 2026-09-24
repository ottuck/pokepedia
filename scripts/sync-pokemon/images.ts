import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CACHE_DIR = path.join(".cache", "artwork");
// Official artwork is 475×475; never upscale, only cap anything larger.
const MAX_SIZE = 512;
// effort 6 was ~75× slower per image for ~1% smaller files; 4 is the sweet spot.
const WEBP = { quality: 85, alphaQuality: 100, effort: 4 } as const;

/** Downloads an artwork PNG once and keeps it under .cache/artwork. */
export async function downloadArtwork(
  url: string,
  cacheName: string,
): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, cacheName);
  try {
    return await readFile(cacheFile);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cacheFile, buffer);
    return buffer;
  }
}

function resized(png: Buffer) {
  return sharp(png).ensureAlpha().resize(MAX_SIZE, MAX_SIZE, {
    fit: "inside",
    withoutEnlargement: true,
  });
}

export function toArtworkWebp(png: Buffer): Promise<Buffer> {
  return resized(png).webp(WEBP).toBuffer();
}

/**
 * Solid black silhouette: RGB forced to 0, alpha kept, so the outline is exact and no
 * colour information survives (unlike a CSS brightness(0) filter over the real artwork).
 */
export function toSilhouetteWebp(png: Buffer): Promise<Buffer> {
  return resized(png)
    .linear([0, 0, 0, 1], [0, 0, 0, 0])
    .webp({ ...WEBP, lossless: true })
    .toBuffer();
}
