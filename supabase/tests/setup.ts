import { existsSync } from "node:fs";

// Locally the keys come from .env.local; CI exports them from `supabase status -o env`.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
