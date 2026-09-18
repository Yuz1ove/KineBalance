import { defineConfig, devices } from '@playwright/test'

const port = 4197
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './output/playwright/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './output/playwright/report', open: 'never' }]
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    {
      name: 'desktop-chromium',
      testMatch: /desktop\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 }
      }
    },
    {
      name: 'portrait-chromium',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'], browserName: 'chromium' }
    },
    {
      name: 'portrait-webkit',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['iPhone 15'], browserName: 'webkit' }
    },
    {
      name: 'reduced-motion-chromium',
      testMatch: /reduced-motion\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
        reducedMotion: 'reduce'
      }
    }
  ]
})
