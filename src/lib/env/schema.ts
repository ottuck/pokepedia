// zod/mini: the browser Supabase client parses the public env, so this ships to every page.
import * as z from "zod/mini";

// Only the new Supabase key format is accepted; legacy anon/service_role JWTs fail fast.
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .check(z.startsWith("sb_publishable_")),
});

export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().check(z.startsWith("sb_secret_")),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
