import "server-only";
import sharp from "sharp";
import { createRetryingFetch } from "@/lib/supabase/retrying-fetch";

const retryingFetch = createRetryingFetch();

/**
 * ImageResponse (satori/resvg) cannot decode webp, and every artwork in Storage is webp.
 * OG images are generated at build time, so converting there costs nothing at runtime.
 */
export async function artworkAsPng(url: string): Promise<string> {
  const response = await retryingFetch(url);
  if (!response.ok)
    throw new Error(`Artwork download failed: ${response.status} ${url}`);
  const png = await sharp(Buffer.from(await response.arrayBuffer()))
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
