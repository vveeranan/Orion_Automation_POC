import {
    test as base,
    expect
} from '@playwright/test';

import { generateTestData } from '../utils/csharpRunner';

import type { TestData } from '../types/testData';

type TestFixtures = {
    testData: TestData;
};

export const test = base.extend<TestFixtures>({
    testData: [async ({}, use, testInfo) => {

        const testCaseId =
            testInfo.title.split(' ')[0];

        const data =
            await generateTestData(testCaseId);

        await use(data);
    }, { timeout: 300000 }]
});

export { expect };
