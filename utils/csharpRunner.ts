import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

import type { TestData } from '../types/testData';

const execFileAsync = promisify(execFile);

export async function generateTestData(
    testCaseId: string
): Promise<TestData> {

    console.log(`Generating data for ${testCaseId}`);

    const binDir = path.resolve('./dotnet/TestDataGenerator/bin/Debug');

    await execFileAsync(
        path.join(binDir, 'TestDataGenerator.exe'),
        [testCaseId],
        { cwd: binDir }
    );

    const jsonFile =
        `./dotnet/TestDataGenerator/ScenarioData/${testCaseId}Data.json`;

    const json = await fs.readFile(
        jsonFile,
        'utf-8'
    );

    return JSON.parse(json) as TestData;
}
