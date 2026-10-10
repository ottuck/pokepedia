import { loadLocalSupabaseTestEnv } from "../../scripts/testing/local-supabase";

// Locally the keys come from .env.local; CI exports them from `supabase status -o env`.
loadLocalSupabaseTestEnv();
