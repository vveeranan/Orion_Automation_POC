import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { login } from './auth';

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
  await page.goto('#/queues');
  await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

  let queueId: number;
  if (create) {
    // 2. Create the queue and keep the id the server gives it
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

    // 3. Select the new queue. Open it by the id returned when it was created (opening it from the re-sorted grid is
    // unreliable) and verify it is the right queue before changing anything on it.
    await page.goto(`#/queues/${queueId}`);
  } else {
    // 2-3. The queue already exists (e.g. ALL CLAIMS): select it in the grid. The grid has not been re-sorted, so the
    // row is the one shown (ALL CLAIMS is the first queue).
    const row = page.getByRole('row', { name: queue.name }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole('cell', { name: queue.name, exact: true }).click();
    await expect(page).toHaveURL(/#\/queues\/\d+$/, { timeout: 20000 });
    queueId = Number(page.url().match(/#\/queues\/(\d+)$/)![1]);
  }
  await expect(page.getByRole('heading', { name: `Queue ${queue.name}` })).toBeVisible({ timeout: 30000 });

  // 4. Assignments: assign the queue to the logged in user. Users already assigned are in the 'assigned' list and
  // clicking one would remove the assignment, so only click a user that is still in the 'unassigned' list.
  await page.getByRole('button', { name: 'Assignments' }).click();
  await expect(page.getByRole('heading', { name: 'Assigned Users / Groups' })).toBeVisible();
  const userName = new RegExp(`^\\s*${username}`);
  const assignedUser = page.locator('.list-group.assigned').getByRole('button', { name: userName });
  const unassignedUser = page.locator('.list-group.unassigned').getByRole('button', { name: userName });
  await expect(assignedUser.or(unassignedUser)).toBeVisible({ timeout: 20000 });
  if (!create) {
    // The panel first lists every user as unassigned and moves the assigned ones across once their assignments have
    // loaded. An existing queue already has assignments, so wait for the assigned list to fill before deciding.
    await expect(page.locator('.list-group.assigned button').first()).toBeVisible({ timeout: 20000 });
  }
  await page.waitForTimeout(3000); // let the users list finish rendering before clicking
  if ((await assignedUser.count()) === 0) {
    const assigned = page.waitForResponse(
      r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
      { timeout: 15000 }
    );
    await unassignedUser.click();
    await assigned;
  }
  await page.getByRole('button', { name: 'Close' }).click();

  // 5. Criteria: add a 'Claim Form Type' criterion of Dental, then remove it again
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

  // Open the Value drop down, select Dental and wait for the criterion to be saved (it saves as soon as it is selected)
  await criteriaRow.first().getByRole('cell').nth(1).getByRole('button').first().click();
  const dental = criteriaPanel.getByRole('link', { name: 'Dental' });
  await expect(dental).toBeVisible({ timeout: 15000 });
  const dentalSaved = page.waitForResponse(
    r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
    { timeout: 20000 }
  );
  await dental.click();
  await dentalSaved;
  await page.waitForTimeout(3000); // let the saved criterion settle before changing it again

  // Remove the Dental criterion again and wait for that change to be saved
  const removeSaved = page.waitForResponse(
    r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
    { timeout: 20000 }
  );
  await criteriaRow.first().getByRole('button', { name: 'Remove' }).click();
  await removeSaved;
  await expect(criteriaRow).toHaveCount(rowsBefore, { timeout: 30000 }); // back to the criteria the queue had before
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Close' }).click();

  // 6. Reload the queue
  await reloadCurrentQueue(page);

  return queueId;
}

/**
 * Reloads the queue that is currently open (#/queues/{id}) so claims matching its criteria are (re)evaluated and
 * added to it. It clicks the 'Reload' button and waits until the server has finished reloading (the grid's loading
 * state clears and the 'Reload' button is available again).
 */
export async function reloadCurrentQueue(page: Page): Promise<void> {
  const reload = page.getByRole('button', { name: 'Reload' });
  await expect(reload).toBeVisible({ timeout: 20000 });
  await reload.click();
  await expect(page.locator('.loading.active')).toHaveCount(0, { timeout: 60000 });
  await expect(reload).toBeEnabled({ timeout: 60000 });
}
