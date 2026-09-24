import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests against a running local Supabase (`pnpm supabase start`).
// They write fixture rows, so run them only on a disposable local database.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./supabase/tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    setupFiles: ["./supabase/tests/setup.ts"],
    fileParallelism: false,
  },
});
