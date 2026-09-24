import { z } from "zod";

// Only the new Supabase key format is accepted; legacy anon/service_role JWTs fail fast.
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_"),
});

export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
