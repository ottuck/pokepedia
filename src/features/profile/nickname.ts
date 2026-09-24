// zod/mini: NicknameForm imports the bounds from here, which puts this module in the browser.
import * as z from "zod/mini";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/**
 * Same bounds as the `profile.nickname` check constraint (2–20 characters after trimming), so
 * a valid form never hits the database error. Control characters are rejected on top.
 */
export const nicknameSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(NICKNAME_MIN),
    z.maxLength(NICKNAME_MAX),
    z.regex(/^[^\p{Cc}\p{Cf}]+$/u),
  );
