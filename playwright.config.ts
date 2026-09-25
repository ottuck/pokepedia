import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// One core journey against local Supabase (`pnpm supabase start`). The app reads its keys
// from .env.local locally; CI exports them from `supabase status -o env` and builds first.
export default defineConfig({
  testDir: "e2e",
  // Generous: the dev server compiles each page on first visit.
  timeout: 180_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `pnpm start --port ${PORT}`
      : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}/ko`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
