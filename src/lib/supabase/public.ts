import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "./database.types";

/**
 * Anonymous client with no session or cookies, for public catalog reads. Because it never
 * touches the request, pages that use it can be prerendered at build time.
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
