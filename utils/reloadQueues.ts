import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { login } from './auth';
import { log } from './logger';
import { reloadPage, reloadUntilVisible } from './grid';

/**
 * Logs in, creates a queue, assigns it to the logged in user, adds then removes a 'Claim Form Type' criterion of
 * Dental, and reloads the queue so claims matching its criteria are (re)evaluated and queued.
 * Shared by every spec file that needs queued claims.
 *
 * @returns the id of the queue that was created
 */
export async function reloadQueues(
  page: Page,
  queue: { name: string; description: string; create?: boolean }
): Promise<number> {
  const create = queue.create ?? true;

  // 1. Log in and open Administration > Queues
  const username = await login(page);
  log('Navigating to Administration > Queues');
  await page.goto('#/queues');
  await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

  let queueId: number;
  if (create) {
    // 2. Create the queue and keep the id the server gives it
    log(`Creating queue ${queue.name}`);
    await page.getByRole('button', { name: 'Add Queue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Queue' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(queue.name);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(queue.description);
    const saved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    queueId = (await (await saved).json()).Id as number;
    await expect(dialog).toBeHidden();
    log(`Queue ${queue.name} created with id ${queueId}`);

    // 3. Select the new queue. Open it by the id returned when it was created (opening it from the re-sorted grid is
    // unreliable) and verify it is the right queue before changing anything on it.
    await page.goto(`#/queues/${queueId}`);
  } else {
    // 2-3. The queue already exists (e.g. ALL CLAIMS): select it in the grid. The grid has not been re-sorted, so the
    // row is the one shown (ALL CLAIMS is the first queue).
    log(`Selecting existing queue ${queue.name}`);
    const row = page.getByRole('row', { name: queue.name }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole('cell', { name: queue.name, exact: true }).click();
    await expect(page).toHaveURL(/#\/queues\/\d+$/, { timeout: 20000 });
    queueId = Number(page.url().match(/#\/queues\/(\d+)$/)![1]);
  }
  // (the page sometimes does not load its data, so reload it if the heading has not appeared; nothing is unsaved yet)
  await reloadUntilVisible(page, page.getByRole('heading', { name: `Queue ${queue.name}` }), 3, 30000);

  // 4. Assignments: assign the queue to the logged in user
  log(`Assigning queue ${queue.name} to ${username}`);
  await assignQueueToUser(page, username, { existingQueue: !create });

  // 5. Criteria: add a 'Claim Form Type' criterion of Dental, then remove it again
  log('Adding then removing a Claim Form Type criterion of Dental');
  await setClaimFormTypeCriterion(page, 'Dental', { remove: true });

  // 6. Reload the queue
  log(`Reloading queue ${queue.name}`);
  await reloadCurrentQueue(page);

  return queueId;
}

/**
 * Assignment template: on the queue that is currently open (#/queues/{id}) opens the Assignments panel and assigns the
 * queue to the user, then closes the panel. Shared by every spec that needs a queue assigned to the logged in user.
 *
 * Users already assigned are in the 'assigned' list and clicking one would remove the assignment, so the user is only
 * clicked while still in the 'unassigned' list. A click can be lost while the panel is re-rendering, so it is repeated
 * (up to 3 times) only while the user is still unassigned, which cannot undo an assignment that worked.
 *
 * @param options.existingQueue true for a queue that already has assignments (e.g. ALL CLAIMS): wait for them to load
 */
export async function assignQueueToUser(page: Page, username: string, options: { existingQueue?: boolean } = {}): Promise<void> {
  const userName = new RegExp(`^\\s*${username}`);
  const assignedUser = page.locator('.list-group.assigned').getByRole('button', { name: userName });
  const unassignedUser = page.locator('.list-group.unassigned').getByRole('button', { name: userName });

  // The panel's user list sometimes does not load. Nothing has been changed yet, so if the user is not listed after 20
  // seconds, reload the page and open the panel again (up to 3 times in all).
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.getByRole('button', { name: 'Assignments' }).click();
    await expect(page.getByRole('heading', { name: 'Assigned Users / Groups' })).toBeVisible({ timeout: 20000 });
    let ready = await expect(assignedUser.or(unassignedUser)).toBeVisible({ timeout: 20000 }).then(() => true, () => false);
    if (ready && options.existingQueue) {
      // The panel first lists every user as unassigned and moves the assigned ones across once their assignments have
      // loaded. An existing queue already has assignments, so wait for the assigned list to fill before deciding.
      ready = await expect(page.locator('.list-group.assigned button').first()).toBeVisible({ timeout: 20000 }).then(() => true, () => false);
    }
    if (ready) {
      break;
    }
    if (attempt === 3) {
      log(`The Assignments panel did not list the user ${username}`, 'Error');
      throw new Error(`The Assignments panel did not list the user ${username}`);
    }
    await reloadPage(page);
    await expect(page.getByRole('button', { name: 'Assignments' })).toBeVisible({ timeout: 30000 });
  }
  await page.waitForTimeout(3000); // let the users list finish rendering before clicking

  // The user is assigned once they are no longer in the 'unassigned' list, so keep clicking only while they are in it
  for (let attempt = 1; attempt <= 3 && (await unassignedUser.count()) > 0; attempt++) {
    const assigned = page
      .waitForResponse(r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(), { timeout: 10000 })
      .catch(() => undefined);
    await unassignedUser.click({ timeout: 15000 });
    await assigned;
    await page.waitForTimeout(3000); // let the lists update
  }
  await expect(unassignedUser).toHaveCount(0, { timeout: 15000 });
  await page.getByRole('button', { name: 'Close' }).click();
  log(`User ${username} assigned to the queue`);
}

/**
 * Criteria template: on the queue that is currently open (#/queues/{id}) opens the Criteria popup, adds a
 * 'Claim Form Type' criterion with the given value and waits for it to be saved. With { remove: true } the criterion is
 * then removed again (and that is saved too), leaving the queue as it was. Closes the popup at the end.
 * Shared by every spec that needs a queue criterion.
 */
export async function setClaimFormTypeCriterion(
  page: Page,
  value: 'Dental' | 'Institutional' | 'Professional' | 'Predetermination',
  options: { remove?: boolean } = {}
): Promise<void> {
  log(`Opening Criteria and adding Claim Form Type criterion: ${value}`);
  await page.getByRole('button', { name: 'Criteria' }).click();
  const criteria = page.getByRole('textbox', { name: 'filter criteria' });
  await expect(criteria).toBeVisible();
  await page.waitForTimeout(2000); // let the criteria list load
  await criteria.click();
  await criteria.pressSequentially('Claim Form', { delay: 80 });
  await page.waitForTimeout(2000); // let the list filter down to the matching criteria

  // Scope everything to the Criteria popup (a modal): a queue that holds claims also has a grid behind it with its own
  // 'Claim Form Type' column-header button, which must not be clicked by mistake.
  const criteriaPanel = page.locator('#edit-criteria');
  await expect(criteriaPanel).toBeVisible();

  // Click the 'Claim Form Type' header; it opens its fields (a Not?/Value table with an 'Add' button)
  await criteriaPanel.getByRole('button', { name: 'Claim Form Type' }).click();
  await page.waitForTimeout(2000);
  const criteriaRow = criteriaPanel.getByRole('row').filter({ has: page.getByRole('button', { name: 'Remove' }) });
  // Each click on 'Add' saves an empty criterion straight away, and the new row takes several seconds to show, so click
  // it ONCE and wait for the row count to go up. Click again only if nothing at all appeared after 30 seconds
  // (clicking early adds duplicate empty criteria to the queue).
  const rowsBefore = await criteriaRow.count();
  for (let attempt = 1; attempt <= 2; attempt++) {
    await criteriaPanel.getByRole('button', { name: 'Add' }).click();
    const added = await expect.poll(() => criteriaRow.count(), { timeout: 30000, intervals: [1000] })
      .toBeGreaterThan(rowsBefore).then(() => true, () => false);
    if (added) {
      break;
    }
  }
  await expect(criteriaRow.first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  // The criterion row that was just added (rows before it, if any, belong to the queue and are left alone)
  const newRow = criteriaRow.nth(rowsBefore);
  const removeNewRow = async () => {
    const removeSaved = page
      .waitForResponse(r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(), { timeout: 20000 })
      .catch(() => undefined);
    await newRow.getByRole('button', { name: 'Remove' }).click();
    await removeSaved;
    await expect(criteriaRow).toHaveCount(rowsBefore, { timeout: 30000 }); // back to the criteria the queue had before
    await page.waitForTimeout(3000);
  };

  try {
    // Open the Value drop down, select the value and wait for the criterion to be saved (it saves as soon as it is
    // selected). The selection is sometimes not registered, so repeat it (up to 3 times) until the row shows the value.
    let selected = false;
    for (let attempt = 1; attempt <= 3 && !selected; attempt++) {
      await newRow.getByRole('cell').nth(1).getByRole('button').first().click();
      const option = criteriaPanel.getByRole('link', { name: value });
      await expect(option).toBeVisible({ timeout: 15000 });
      const valueSaved = page
        .waitForResponse(r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(), { timeout: 10000 })
        .catch(() => undefined);
      await option.click();
      await valueSaved;
      selected = await expect(newRow.getByRole('textbox')).toHaveValue(value, { timeout: 8000 }).then(() => true, () => false);
      await page.waitForTimeout(2000);
    }
    await expect(newRow.getByRole('textbox'), `the criterion shows ${value}`).toHaveValue(value);
    await page.waitForTimeout(3000); // let the saved criterion settle
    log(`Claim Form Type criterion saved with value ${value}`);
  } catch (error) {
    // Do not leave an empty or half-set criterion on the queue (it would affect every later run): remove the row that
    // was added, then report the original failure
    await removeNewRow().catch(() => undefined);
    await page.getByRole('button', { name: 'Close' }).click().catch(() => undefined);
    log(`Could not set the Claim Form Type criterion to ${value}; the added criterion was removed`, 'Error');
    throw error;
  }

  if (options.remove) {
    await removeNewRow();
    log('Claim Form Type criterion removed');
  }

  await page.getByRole('button', { name: 'Close' }).click();
}

/**
 * Reloads the queue that is currently open (#/queues/{id}) so claims matching its criteria are (re)evaluated and
 * added to it. It clicks the 'Reload' button and waits until the server has finished reloading (the grid's loading
 * state clears and the 'Reload' button is available again).
 */
export async function reloadCurrentQueue(page: Page): Promise<void> {
  const reload = page.getByRole('button', { name: 'Reload' });
  await expect(reload).toBeVisible({ timeout: 20000 });

  // The Reload button stays disabled until the queue page has finished loading. If it is still disabled after 30
  // seconds the page has not loaded properly, so reload the page (up to 3 times) and wait again.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const enabled = await expect(reload).toBeEnabled({ timeout: 30000 }).then(() => true, () => false);
    if (enabled) {
      break;
    }
    if (attempt === 3) {
      log('The Reload button stayed disabled: the queue page did not finish loading', 'Error');
      throw new Error('The Reload button stayed disabled: the queue page did not finish loading');
    }
    await reloadPage(page);
    await expect(reload).toBeVisible({ timeout: 20000 });
  }

  log('Clicking Reload button');
  await reload.click();
  await expect(page.locator('.loading.active')).toHaveCount(0, { timeout: 60000 });

  // The server finishes the reload within seconds, but the page is told it is done by a push message that sometimes
  // never arrives, which leaves the Reload button disabled. If it has not re-enabled after 30 seconds, refresh the page:
  // the reloaded queue is already saved on the server.
  const finished = await expect(reload).toBeEnabled({ timeout: 30000 }).then(() => true, () => false);
  if (!finished) {
    await reloadPage(page);
    await expect(reload).toBeEnabled({ timeout: 30000 });
  }
}
