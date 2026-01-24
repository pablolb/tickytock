import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/features',
  testMatch: '**/*.feature',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'e2e/reports/playwright-html' }],
    ['json', { outputFile: 'e2e/reports/playwright-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Default timeout for actions like click, fill, etc.
    actionTimeout: 30000,
    // Default timeout for navigation
    navigationTimeout: 30000,
  },
  // Default timeout for expect() assertions
  expect: {
    timeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
