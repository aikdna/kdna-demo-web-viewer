import { defineConfig } from '@playwright/test'
import path from 'node:path'
const output = process.env.KDNA_EVIDENCE_DIR ?? '.demo-test-results'
export default defineConfig({
  testDir: './tests/e2e', workers: 1, retries: 0, fullyParallel: false, timeout: 45000,
  expect: { timeout: 10000 }, forbidOnly: true, globalTeardown: './tests/global-teardown.mjs',
  outputDir: path.join(output,'artifacts'), reporter: [['line'],['json',{ outputFile: path.join(output,'playwright-report.json') }]],
  use: { screenshot: 'off', trace: 'off', video: 'off', viewport: { width: 1280, height: 900 } },
  projects: [ { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'webkit', use: { browserName: 'webkit' } } ],
})
