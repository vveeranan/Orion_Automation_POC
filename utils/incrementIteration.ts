import fs from 'fs/promises';
import path from 'path';

import { buildTestDataGenerator } from './buildTestDataGenerator';

const appSettingsPath = path.resolve(
    __dirname,
    '../dotnet/TestDataGenerator/appsettings.json'
);

// Runs once per `npx playwright test` invocation (Playwright globalSetup).
export default async function incrementIteration(): Promise<void> {
    const content = await fs.readFile(appSettingsPath, 'utf-8');

    const pattern = /("Iteration"\s*:\s*")(\d+)(")/;
    const match = content.match(pattern);

    if (!match) {
        throw new Error(`"Iteration" not found in ${appSettingsPath}`);
    }

    const next = String(Number(match[2]) + 1).padStart(match[2].length, '0');

    await fs.writeFile(
        appSettingsPath,
        content.replace(pattern, `$1${next}$3`)
    );

    console.log(`Iteration incremented: ${match[2]} -> ${next}`);

    await buildTestDataGenerator();
}
