import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// One core journey against local Supabase (`pnpm supabase start`), run by hand before
// bigger changes (not in CI). The app reads its keys from .env.local. It runs on the dev
// server: a production build prerenders OG images from Storage artwork, which the seed
// catalog does not upload.
export default defineConfig({
  testDir: "e2e",
  // Generous: the dev server compiles each page on first visit.
  timeout: 180_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}/ko`,
    reuseExistingServer: true,
    // Stop `next dev` (behind pnpm) cleanly so the run exits once the test is done.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    timeout: 180_000,
  },
});
