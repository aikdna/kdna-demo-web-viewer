import { defineConfig } from '@playwright/test'

const port = Number(process.env.KDNA_DEMO_PORT ?? 3210)

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  globalTeardown: './tests/global-teardown.mjs',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env,
      KDNA_STORAGE_DIR: '.kdna-test-storage',
    },
  },
})
