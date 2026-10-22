import { defineConfig, devices } from '@playwright/test';

const chromium = process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath: chromium },
    trace: 'off',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: { executablePath: chromium } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, browserName: 'chromium', launchOptions: { executablePath: chromium } } },
  ],
});
