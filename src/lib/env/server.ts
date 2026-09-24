import "server-only";
import { serverEnvSchema, type ServerEnv } from "./schema";

export const serverEnv: ServerEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
