import { defineConfig, devices } from '@playwright/test';

/**
 * Buzz Platform E2E Test Configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    baseURL: 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Buzz App (Customer App) - Chrome
    {
      name: 'buzz-chrome',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8110',
      },
      dependencies: ['setup'],
      testMatch: /.*buzz\/.*\.spec\.ts/,
    },

    // Buzz App - Mobile Chrome
    {
      name: 'buzz-mobile',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:8110',
      },
      dependencies: ['setup'],
      testMatch: /.*buzz\/.*\.mobile\.spec\.ts/,
    },

    // Buzz-Biz App (Business App) - Chrome
    {
      name: 'buzz-biz-chrome',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8108',
      },
      dependencies: ['setup'],
      testMatch: /.*buzz-biz\/.*\.spec\.ts/,
    },

    // Buzz-Admin App (Admin Dashboard) - Chrome
    {
      name: 'buzz-admin-chrome',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8109',
      },
      dependencies: ['setup'],
      testMatch: /.*buzz-admin\/.*\.spec\.ts/,
    },

    // Cross-browser testing
    {
      name: 'cross-browser-firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:8110',
      },
      dependencies: ['setup'],
      testMatch: /.*\/critical\/.*\.spec\.ts/,
    },

    {
      name: 'cross-browser-safari',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:8110',
      },
      dependencies: ['setup'],
      testMatch: /.*\/critical\/.*\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter=buzz dev',
      port: 8106,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter=buzz-biz dev',
      port: 8105,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter=buzz-admin dev',
      port: 8104,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter=@buzz/api dev',
      port: 8083,
      reuseExistingServer: !process.env.CI,
    },
  ],
});