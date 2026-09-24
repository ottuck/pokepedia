import { publicEnvSchema, type PublicEnv } from "./schema";

// Each NEXT_PUBLIC_* var must be referenced literally so Next.js can inline it into the
// browser bundle; passing `process.env` as a whole would leave them undefined on the client.
export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
