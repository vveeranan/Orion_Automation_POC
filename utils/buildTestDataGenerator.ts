import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

const msbuildPath =
    process.env.MSBUILD_PATH ??
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe';

const solutionPath = path.resolve(
    __dirname,
    '../dotnet/TestDataGenerator/TestDataGenerator.sln'
);

// Builds the .NET Framework TestDataGenerator (once per Playwright run).
export async function buildTestDataGenerator(): Promise<void> {
    console.log('Building TestDataGenerator...');

    try {
        await execFileAsync(
            msbuildPath,
            [solutionPath, '-restore', '-nologo', '-v:minimal', '-p:Configuration=Debug'],
            { maxBuffer: 10 * 1024 * 1024 }
        );
    } catch (error: any) {
        throw new Error(
            `TestDataGenerator build failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`
        );
    }
}
