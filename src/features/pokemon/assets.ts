import { publicEnv } from "@/lib/env/public";

const ARTWORK_BUCKET = "pokemon-artwork";

/** Public Storage URL for an artwork path such as "normal/025.webp". */
export function artworkUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ARTWORK_BUCKET}/${path}`;
}

const SILHOUETTE_BUCKET = "quiz-silhouette";

/** Public Storage URL for a quiz silhouette; the file name is opaque (see sync script). */
export function silhouetteUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SILHOUETTE_BUCKET}/${path}`;
}
