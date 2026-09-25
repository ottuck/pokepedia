import { publicEnv } from "@/lib/env/public";

/** Public bucket; see the avatars migration for who may write where. */
export const AVATAR_BUCKET = "avatars";
/** Edge of the square picture made in the browser before upload. */
export const AVATAR_SIZE = 256;
/** The bucket's limit. The resized picture is usually 10–40 KB, far below it. */
export const AVATAR_MAX_BYTES = 512 * 1024;

/** A fresh object name in the owner's folder; a new name per upload avoids stale caches. */
export function newAvatarPath(
  userId: string,
  extension: "webp" | "jpg",
  now = Date.now(),
): string {
  return `${userId}/${now}.${extension}`;
}

/** Mirrors the profile.avatar_path check constraint. */
export function isOwnAvatarPath(userId: string, path: string): boolean {
  const [folder, file, ...rest] = path.split("/");
  return (
    folder === userId &&
    rest.length === 0 &&
    /^[0-9]{10,16}\.(webp|jpg)$/.test(file ?? "")
  );
}

export function avatarUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/**
 * The picture to show: an uploaded avatar first, then the Google account picture that
 * Supabase copies into user_metadata, else none (callers show the initial).
 */
export function pickAvatar(
  avatarPath: string | null | undefined,
  googlePicture: string | null | undefined,
): string | null {
  if (avatarPath) return avatarUrl(avatarPath);
  return googlePicture ?? null;
}

/**
 * The Google account picture Supabase copies into user_metadata (`avatar_url` or `picture`).
 * Only https URLs are trusted; anything else in the metadata is ignored.
 */
export function googlePicture(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  for (const key of ["avatar_url", "picture"] as const) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === "string" && value.startsWith("https://")) return value;
  }
  return null;
}
