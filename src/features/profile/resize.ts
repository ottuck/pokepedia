import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "./avatar";

export type AvatarImageError = "not_image" | "too_large" | "unreadable";

export class AvatarImageFailure extends Error {
  constructor(readonly code: AvatarImageError) {
    super(code);
  }
}

/** Phone photos are several MB; anything far beyond that is not a picture worth decoding. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Turns the chosen file into the uploaded avatar: a centered square crop, 256 px, webp (or
 * jpeg where the browser cannot encode webp, e.g. older Safari). Doing it in the browser keeps
 * uploads small and strips photo metadata such as GPS location.
 */
export async function toAvatarImage(
  file: File,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  if (!file.type.startsWith("image/"))
    throw new AvatarImageFailure("not_image");
  if (file.size > MAX_INPUT_BYTES) throw new AvatarImageFailure("too_large");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarImageFailure("unreadable");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new AvatarImageFailure("unreadable");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  // Browsers that cannot encode a type silently return PNG instead.
  let blob = await encode("image/webp");
  let extension: "webp" | "jpg" = "webp";
  if (blob?.type !== "image/webp") {
    blob = await encode("image/jpeg");
    extension = "jpg";
  }
  if (!blob) throw new AvatarImageFailure("unreadable");
  if (blob.size > AVATAR_MAX_BYTES) throw new AvatarImageFailure("too_large");
  return { blob, extension };
}
