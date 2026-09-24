import { defineConfig } from "vitest/config";

// Integration tests against a running local Supabase (`pnpm supabase start`).
// They write fixture rows, so run them only on a disposable local database.
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    setupFiles: ["./supabase/tests/setup.ts"],
    fileParallelism: false,
  },
});
