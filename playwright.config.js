import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
    serviceWorkers: 'block',
    baseURL: 'http://127.0.0.1:4183',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port=4183 --host=127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4183/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
