import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Unit tests import server modules directly; the real package throws outside RSC.
      "server-only": fileURLToPath(
        new URL("./supabase/tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Public values only, in the validated format: modules that build Storage URLs import
    // lib/env/public, which checks these at import time. No secret is ever set here.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
});
