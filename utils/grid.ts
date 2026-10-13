import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { log } from './logger';

/**
 * Reads the 'N <noun>' count label shown above a grid (e.g. '3 Queues') once the grid has finished loading.
 * The label text is not an isolated node, so it is matched unanchored.
 */
export async function readCount(page: Page, noun: RegExp): Promise<number> {
  const label = page.getByText(new RegExp(`\\d+\\s+${noun.source}`)).first();
  await expect(label).toBeVisible({ timeout: 15000 });
  const read = async () =>
    Number(((await label.textContent()) ?? '').match(new RegExp(`(\\d+)\\s+${noun.source}`))![1]);

  // 'networkidle' is unreliable here (the Queues page keeps polling), and the label shows a provisional '0' until
  // the grid data arrives (slow on the Tasks page). Wait for the grid's loading state to clear, then accept the
  // count once two reads one second apart agree.
  await page.waitForTimeout(1000); // give the grid time to enter its loading state after navigation
  await expect(page.locator('.loading.active')).toHaveCount(0, { timeout: 45000 });
  let previous = -1;
  let current = await read();
  for (let attempt = 0; attempt < 10 && current !== previous; attempt++) {
    previous = current;
    await page.waitForTimeout(1000);
    current = await read();
  }
  log(`Read count for ${noun.source}: ${current}`);
  return current;
}

/**
 * Waits for `target` to be visible. The Queues pages sometimes fail to load their data (the backend is slow), which
 * leaves them blank or with empty lists, so if `target` has not appeared in time the page is reloaded and the wait is
 * repeated (up to `attempts` times in all). Do not use it after typing into a form: a reload discards unsaved edits.
 */
export async function reloadUntilVisible(page: Page, target: Locator, attempts = 3, timeout = 20000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await expect(target).toBeVisible({ timeout });
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      log(`Expected element not visible (attempt ${attempt} of ${attempts}); reloading the page`, 'Error');
      await reloadPage(page);
    }
  }
}

/**
 * Reloads the current page and stays on the same route.
 * When the app reloads it first passes through its '#/configuration' loading screen and does not always come back to
 * the route it was on (a deep link such as #/queueschedules/{id} can end up as a blank new-schedule form), so this
 * waits for the configuration to finish and goes back to the original route if the app landed somewhere else.
 */
export async function reloadPage(page: Page): Promise<void> {
  const route = new URL(page.url()).hash; // e.g. '#/queueschedules/<id>'
  await page.reload();
  await page.waitForFunction(() => !location.hash.startsWith('#/configuration'), null, { timeout: 60000 }).catch(() => undefined);
  if (route && new URL(page.url()).hash !== route) {
    await page.goto(route);
  }
}

/**
 * Sorts the Queues grid by ID descending so the most recently created queue is on the first page.
 * The grid is paged at 10 rows, its search box does not filter, and test runs keep adding queues, so a new queue
 * cannot be assumed to be on the first page in the default (ascending) order. The grid reloads slowly after
 * sorting (up to ~10s), so callers should allow a generous timeout when waiting for the row.
 */
export async function sortQueuesNewestFirst(page: Page): Promise<void> {
  log('Sorting the Queues grid by ID descending');
  await page.getByRole('columnheader', { name: 'ID' }).getByRole('button', { name: 'ID' }).click();
  await page.getByRole('menuitem', { name: /Descending/ }).click();
}

/**
 * Finds a queue's row in the Queues grid: sorts the grid newest-first (see sortQueuesNewestFirst) and waits for the
 * queue's row. The grid reloads slowly after sorting and sometimes the sort is not applied, so if the row has not shown
 * up in 30 seconds the page is reloaded and the sort repeated (up to 3 times in all).
 */
export async function findQueueRow(page: Page, queueName: string): Promise<Locator> {
  const row = page.getByRole('row', { name: new RegExp(queueName) });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sortQueuesNewestFirst(page);
    const found = await expect(row).toBeVisible({ timeout: 30000 }).then(() => true, () => false);
    if (found) {
      log(`Found queue ${queueName} in the Queues grid`);
      return row;
    }
    if (attempt === 3) {
      log(`The queue ${queueName} was not found in the Queues grid`, 'Error');
      throw new Error(`The queue ${queueName} was not found in the Queues grid`);
    }
    await reloadPage(page);
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 30000 });
  }
  return row;
}
