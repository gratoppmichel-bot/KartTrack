import { defineConfig } from "@playwright/test";

// Tests run against a production build of the app talking to e2e/mock-supabase.mjs.
// Set PW_CHROMIUM_PATH to use an already installed Chromium instead of Playwright's own.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3111",
    launchOptions: { args: ["--no-sandbox"], ...(executablePath ? { executablePath } : {}) },
  },
  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      port: 54321,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run build && npm run start -- -p 3111",
      port: 3111,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-key",
      },
    },
  ],
});
