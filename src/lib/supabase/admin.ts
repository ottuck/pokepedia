import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "./database.types";

/**
 * Privileged client using the secret key (Postgres `service_role`): bypasses RLS and can
 * execute service-only RPCs. Only for server code that has already derived the user from the
 * session — never pass client-supplied user ids through it unchecked.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
