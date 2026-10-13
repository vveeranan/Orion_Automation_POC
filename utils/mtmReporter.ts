import * as fs from 'fs';
import * as path from 'path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Writes MTM_Update.txt to the project root at the end of a run, listing the passed and failed test cases with their
 * execution time:
 *   SET PASSTESTCASES=6286_0:00:01:46.698,6287_0:00:01:12.004
 *   SET FAILTESTCASES=6288_0:00:00:09.512
 * Each entry is <test case number>_<days:hh:mm:ss.mmm>, entries are comma separated. Only the final attempt of a
 * retried test counts, and skipped tests are left out. The file is replaced on every run.
 */
export default class MtmReporter implements Reporter {
  private readonly passed = new Map<string, string>();
  private readonly failed = new Map<string, string>();

  onTestEnd(test: TestCase, result: TestResult): void {
    const match = /^TC(\d+)/.exec(test.title);
    if (!match || result.status === 'skipped') {
      return;
    }
    const entry = `${match[1]}_${formatDuration(result.duration)}`;
    // A retry replaces the earlier attempt's entry
    this.passed.delete(match[1]);
    this.failed.delete(match[1]);
    (result.status === 'passed' ? this.passed : this.failed).set(match[1], entry);
  }

  onEnd(): void {
    const lines = [
      `SET PASSTESTCASES=${[...this.passed.values()].join(',')}`,
      `SET FAILTESTCASES=${[...this.failed.values()].join(',')}`,
    ];
    fs.writeFileSync(path.resolve(__dirname, '..', 'MTM_Update.txt'), lines.join('\r\n'), 'utf8');
  }
}

/** Milliseconds as days:hh:mm:ss.mmm, e.g. 106698 -> 0:00:01:46.698 */
function formatDuration(ms: number): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000) % 24;
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return `${days}:${p(hours)}:${p(minutes)}:${p(seconds)}.${p(ms % 1000, 3)}`;
}
