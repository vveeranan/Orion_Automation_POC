import {
    test as base,
    expect
} from '@playwright/test';

import { generateTestData } from '../utils/csharpRunner';
import { log, logTestEnd, logTestStart } from '../utils/logger';

import type { TestData } from '../types/testData';

type TestFixtures = {
    testData: TestData;
    testLog: void;
};

export const test = base.extend<TestFixtures>({
    // Starts the test's log file (<test case id>_<date>_<time>.log) and records how the test ended, including the
    // error messages of a failure. Automatic, so every test gets a log without asking for it.
    testLog: [async ({}, use, testInfo) => {
        logTestStart(testInfo.title);
        await use();
        logTestEnd(testInfo.status, testInfo.errors);
    }, { auto: true }],

    testData: [async ({}, use, testInfo) => {

        const testCaseId =
            testInfo.title.split(' ')[0];

        log(`Running test setup for ${testCaseId.replace(/^TC/, '')}.`);
        const data =
            await generateTestData(testCaseId);
        log('Created test setup data file.');

        await use(data);
    }, { timeout: 300000 }]
});

export { expect };
