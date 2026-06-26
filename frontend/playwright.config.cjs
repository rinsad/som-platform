const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.CAPEX_VIDEO_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on',
    viewport: { width: 1440, height: 960 },
  },
  projects: [
    {
      name: 'chromium-capex-video',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node src/index.js',
      cwd: '../backend',
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173',
      env: {
        VITE_PROXY_TARGET: 'http://127.0.0.1:5000',
      },
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
