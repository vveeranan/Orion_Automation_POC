import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test } from '@playwright/test';

export type LogLevel = 'Debug' | 'Error';

const PROJECT_ROOT = path.resolve(__dirname, '..');

// One log file per test run (a retry gets its own), created on the first message written for that test
const logFiles = new Map<string, string>();

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function lineTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** The test case id is the first word of the test title, e.g. 'TC6286 Create a new member ticket' -> 'TC6286'. */
function testCaseId(title: string): string {
  return title.split(' ')[0];
}

function logFileFor(info: ReturnType<typeof test.info>): string {
  const key = `${info.testId}#${info.retry}`;
  let file = logFiles.get(key);
  if (!file) {
    const retry = info.retry ? `_retry${info.retry}` : '';
    file = path.join(PROJECT_ROOT, `${testCaseId(info.title)}_${stamp(new Date())}${retry}.log`);
    logFiles.set(key, file);
  }
  return file;
}

/**
 * Appends a message to the log file of the test that is running, as '<time> [<level>] <message>'.
 * The file is <test case id>_<yyyyMMdd_HHmmss>.log in the project root. Safe to call from any helper used by a test.
 * Never log the password.
 */
export function log(message: string, level: LogLevel = 'Debug'): void {
  const line = `${lineTime(new Date())} [${level}] ${message}\n`;
  try {
    fs.appendFileSync(logFileFor(test.info()), line, 'utf8');
  } catch {
    // Logging must never fail a test (e.g. called outside a test)
  }
}

/** Logs the start of the test case. Called by the auto fixture in fixtures/testData.fixture.ts. */
export function logTestStart(title: string): void {
  log(`Running test case ${testCaseId(title)} by user ${os.userInfo().username}`);
}

/** Logs how the test case ended: 'Test case completed', or the failure and each error message. */
export function logTestEnd(status: string | undefined, errors: ReadonlyArray<{ message?: string }>): void {
  if (!errors.length && (status === 'passed' || status === 'skipped')) {
    log('Test case completed');
    return;
  }
  log(`Test case failed (status: ${status})`, 'Error');
  for (const error of errors) {
    // Playwright error messages carry terminal colour codes
    const message = (error.message ?? 'Unknown error').replace(/\u001b\[[0-9;]*m/g, '');
    log(message, 'Error');
  }
}
