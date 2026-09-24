import { z } from "zod";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/**
 * Same bounds as the `profile.nickname` check constraint (2–20 characters after trimming), so
 * a valid form never hits the database error. Control characters are rejected on top.
 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN)
  .max(NICKNAME_MAX)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u);
