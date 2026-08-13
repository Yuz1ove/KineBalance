import { defineConfig, devices } from '@playwright/test'

const port = 4197
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './output/playwright/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 6_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './output/playwright/report', open: 'never' }]
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'android-chromium',
      testMatch: /mobile-orientation\.spec\.ts/,
      use: { ...devices['Pixel 5'], browserName: 'chromium' }
    },
    {
      name: 'mobile-webkit',
      testMatch: /mobile-orientation\.spec\.ts/,
      use: { ...devices['iPhone 15'], browserName: 'webkit' }
    },
    {
      name: 'narrow-desktop',
      testMatch: /narrow-desktop\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 500, height: 900 },
        screen: { width: 1440, height: 900 },
        hasTouch: false,
        isMobile: false
      }
    },
    {
      name: 'reduced-motion',
      testMatch: /reduced-motion\.spec\.ts/,
      use: {
        ...devices['iPhone 15'],
        browserName: 'chromium',
        reducedMotion: 'reduce'
      }
    }
  ]
})
