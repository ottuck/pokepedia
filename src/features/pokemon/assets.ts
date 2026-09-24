import { publicEnv } from "@/lib/env/public";

const ARTWORK_BUCKET = "pokemon-artwork";

/** Public Storage URL for an artwork path such as "normal/025.webp". */
export function artworkUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ARTWORK_BUCKET}/${path}`;
}
