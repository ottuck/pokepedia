import "server-only";
import { serverEnvSchema, type ServerEnv } from "./schema";

let cached: ServerEnv | undefined;

/**
 * Server-only settings, validated on first use rather than at import. A missing secret then
 * fails the one request that needs it, with a message naming the variable, instead of
 * crashing every module that merely imports this file.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const result = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment (${problems})`);
  }
  cached = result.data;
  return cached;
}
