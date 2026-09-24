import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

// src/lib/supabase/* import "server-only", which throws outside React Server Components,
// so tests build their own clients with the same keys.

const options = { auth: { persistSession: false, autoRefreshToken: false } };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is not set. Run \`pnpm supabase start\` first.`);
  return value;
}

export function anonClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    options,
  );
}

export function adminClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    options,
  );
}

/** A freshly signed-up user, i.e. the `authenticated` role (local auth skips email confirmation). */
export async function authenticatedClient() {
  const client = anonClient();
  const { error } = await client.auth.signUp({
    email: `rls-${crypto.randomUUID()}@example.test`,
    password: crypto.randomUUID(),
  });
  if (error) throw error;
  return client;
}
