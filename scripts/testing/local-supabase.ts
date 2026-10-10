import { existsSync } from "node:fs";

/** Test suites write fixtures and must never reach a hosted Supabase project. */
export function assertLocalSupabase(value: string | undefined): void {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error("Supabase tests require a valid local Supabase URL.");
  }
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Refusing to run Supabase tests against a non-local URL.");
  }
}

/** CI supplies the environment; local runs use .env.local. Validate before any requests. */
export function loadLocalSupabaseTestEnv(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
  assertLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
