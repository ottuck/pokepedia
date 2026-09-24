import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";

/** Supabase client for Client Components. Acts as the signed-in user (publishable key + session cookie). */
export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
