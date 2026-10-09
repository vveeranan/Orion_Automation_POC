import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  globalSetup: './utils/incrementIteration.ts',
  fullyParallel: true,
  workers: 1,

  reporter: [
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],

  use: {
    browserName: 'chromium',
    channel: 'chrome',
    baseURL: 'http://tillamook22.applegate.local:8100/#/login',
    headless: false,
    trace: 'on-first-retry',
  },
});
