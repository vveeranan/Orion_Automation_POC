import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // seed.spec.ts is a prerequisite used to set up the page for the Playwright planner/generator agents,
  // not a test case, so keep it out of normal runs and reports. Set PW_INCLUDE_SEED=1 to run it on demand.
  testIgnore: process.env.PW_INCLUDE_SEED ? [] : ['**/seed.spec.ts'],
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
