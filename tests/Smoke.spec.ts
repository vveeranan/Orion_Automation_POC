// spec: specs/Smoke.md
// seed: tests/seed.spec.ts

import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures/testData.fixture';
import { login } from '../utils/auth';
import { reloadCurrentQueue, reloadQueues } from '../utils/queues';

/**
 * Reads the 'N <noun>' count label shown above a grid (e.g. '3 Queues') once the grid has finished loading.
 * The label text is not an isolated node, so it is matched unanchored.
 */
async function readCount(page: Page, noun: RegExp): Promise<number> {
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
  return current;
}

/**
 * Waits for `target` to be visible. The Queues pages sometimes fail to load their data (the backend is slow), which
 * leaves them blank or with empty lists, so if `target` has not appeared in time the page is reloaded and the wait is
 * repeated (up to `attempts` times in all). Do not use it after typing into a form: a reload discards unsaved edits.
 */
async function reloadUntilVisible(page: Page, target: Locator, attempts = 3, timeout = 20000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await expect(target).toBeVisible({ timeout });
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await page.reload();
    }
  }
}

/**
 * Sorts the Queues grid by ID descending so the most recently created queue is on the first page.
 * The grid is paged at 10 rows, its search box does not filter, and test runs keep adding queues, so a new queue
 * cannot be assumed to be on the first page in the default (ascending) order. The grid reloads slowly after
 * sorting (up to ~10s), so callers should allow a generous timeout when waiting for the row.
 */
async function sortQueuesNewestFirst(page: Page): Promise<void> {
  await page.getByRole('columnheader', { name: 'ID' }).getByRole('button', { name: 'ID' }).click();
  await page.getByRole('menuitem', { name: /Descending/ }).click();
}

test.describe('Ticket creation', () => {
  test('TC6286 Create a new member ticket', { tag: ['@Smoke', '@Member', '@Ticket'] }, async ({ page, testData }) => {
    // 1. Log in and open Customer Service > My Tickets
    const username = await login(page);
    await page.goto('#/mytickets');
    await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();

    // Record the ticket count as the baseline (wait for grid data so the count is loaded)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
    const baseline = await readCount(page, /Tickets/);

    // 2. Add Ticket > Member Call. The ticket is created immediately and the URL changes to #/tickets/{id}
    await page.getByRole('link', { name: 'Add Ticket' }).click();
    await expect(page).toHaveURL(/#\/newticket/);
    await page.getByRole('button', { name: 'Member Call' }).click();

    await expect(page).toHaveURL(/#\/tickets\/\d+$/);
    const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];

    // The new ticket starts in the 'Open' status with the member search available
    await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Same as Caller' })).toBeVisible();
    const memberSearch = page.getByRole('textbox', { name: 'search' });
    await expect(memberSearch).toBeVisible();

    // 3. Enter the caller and caller phone
    const callerBox = page.getByRole('textbox').first();
    await callerBox.fill(testData.Caller);
    await page.getByRole('textbox').nth(1).fill(testData.CallerPhone);
    await expect(callerBox).toHaveValue(testData.Caller);

    // 4. Search for the member created by the setup (submit with Enter) and select the match
    await memberSearch.fill(testData.SearchMemberName);
    await memberSearch.press('Enter');
    await page.getByRole('row', { name: new RegExp(testData.SearchMemberName) }).click();
    await expect(page.getByRole('link', { name: new RegExp(testData.ExpectedMemberNameInTab) })).toBeVisible();

    // 5. Back on My Tickets the new ticket is listed first and the count is up by one
    await page.goto('#/mytickets');
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Tickets`)).first()).toBeVisible();

    const topRow = page.getByRole('row').nth(1);
    await expect(topRow.getByRole('cell', { name: ticketId, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Open', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: testData.Caller, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: username })).toBeVisible();
  });

  test('TC6287 Create a new provider ticket', { tag: ['@Smoke', '@Provider', '@Ticket'] }, async ({ page, testData }) => {
    // 1. Log in and open Customer Service > My Tickets
    const username = await login(page);
    await page.goto('#/mytickets');
    await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();

    // Record the ticket count as the baseline (wait for grid data so the count is loaded)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
    const baseline = await readCount(page, /Tickets/);

    // 2. Add Ticket > Provider Call. Unlike a Member Call, the ticket is NOT created on the click: the page stays
    // on #/newticket and shows a 'provider search' box with the message 'Provider is required.'
    await page.getByRole('link', { name: 'Add Ticket' }).click();
    await expect(page).toHaveURL(/#\/newticket/);
    await page.getByRole('button', { name: 'Provider Call' }).click();

    const providerSearch = page.getByRole('textbox', { name: 'search' });
    await expect(providerSearch).toBeVisible();
    // (the message is rendered twice - in a validation summary list and inline - so take the first match)
    await expect(page.getByText('Provider is required.').first()).toBeVisible();

    // 3. Enter the caller and caller phone
    const callerBox = page.getByRole('textbox').first();
    await callerBox.fill(testData.Caller);
    await page.getByRole('textbox').nth(1).fill(testData.CallerPhone);
    await expect(callerBox).toHaveValue(testData.Caller);

    // 4. Search for the provider created by the setup (submit with Enter) and select the match
    await providerSearch.fill(testData.SearchProviderName);
    await providerSearch.press('Enter');
    await page.getByRole('row', { name: new RegExp(testData.SearchProviderName) }).click();

    // Selecting the provider satisfies the requirement: the ticket is created and the URL changes to #/tickets/{id}
    await expect(page).toHaveURL(/#\/tickets\/\d+$/, { timeout: 15000 });
    const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];
    await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(testData.ExpectedProviderNameInTab) })).toBeVisible();

    // 5. Back on My Tickets the new ticket is listed first and the count is up by one
    await page.goto('#/mytickets');
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Tickets`)).first()).toBeVisible();

    const topRow = page.getByRole('row').nth(1);
    await expect(topRow.getByRole('cell', { name: ticketId, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Provider', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Open', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: testData.Caller, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: username })).toBeVisible();
  });
});

test.describe('Administration', () => {
  test('TC6288 Create a new group', { tag: ['@Smoke', '@Group', '@Administration'] }, async ({ page, testData }) => {
    // 1. Log in and open Administration > Groups
    await login(page);
    await page.goto('#/groups');
    await expect(page.getByRole('heading', { name: /Groups/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Group' })).toBeVisible();

    // Record the group count as the baseline (the grid may legitimately be empty, so do not wait for a row)
    const baseline = await readCount(page, /Groups?/);

    // 2. Click 'Add Group'; the 'Group' dialog opens with Name and Description fields
    await page.getByRole('button', { name: 'Add Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Group' });
    await expect(dialog).toBeVisible();

    // 3. Enter the group name and description from the setup and save, waiting for the save request to complete
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.GroupName);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.GroupDescription);
    const saved = page.waitForResponse(
      r => /\/groups/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    await saved;

    // 4. The dialog closes and the group count is up by one (the grid reloads slowly after saving)
    await expect(dialog).toBeHidden();
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Groups?`)).first()).toBeVisible({ timeout: 30000 });

    // 5. Search for the group (the grid is paged at 10 per page, so do not rely on it being on the first page) and
    // verify its name and description are listed. The search takes a few seconds to filter the grid.
    const search = page.getByRole('textbox', { name: 'search' });
    await search.fill(testData.GroupName);
    await search.press('Enter');
    const groupRow = page.getByRole('row', { name: new RegExp(testData.GroupName) });
    await expect(groupRow).toBeVisible({ timeout: 30000 });
    await expect(groupRow.getByRole('cell', { name: testData.GroupName, exact: true })).toBeVisible();
    await expect(groupRow.getByRole('cell', { name: testData.GroupDescription, exact: true })).toBeVisible();
  });

  test('TC6289 Create a new queue', { tag: ['@Smoke', '@Queue', '@Administration'] }, async ({ page, testData }) => {
    // The Queues grid reloads slowly after saving and sorting; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in and open Administration > Queues
    await login(page);
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

    // Record the queue count as the baseline (wait for grid data so the count is loaded)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
    const baseline = await readCount(page, /Queues?/);

    // 2. Click 'Add Queue'; the 'Queue' dialog opens with Name and Description fields
    await page.getByRole('button', { name: 'Add Queue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Queue' });
    await expect(dialog).toBeVisible();

    // 3. Enter the queue name and description from the setup and save, waiting for the save request to complete
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.QueueName);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.QueueDescription);
    const saved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    await saved;

    // 4. The dialog closes and the queue count is up by one
    await expect(dialog).toBeHidden();
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Queues?`)).first()).toBeVisible({ timeout: 30000 });

    // 5. Verify the new queue is listed with its name and description.
    // The grid shows 10 queues per page and its search box does not filter, so sort by ID descending (newest first).
    // A queue created from the UI starts disabled, so the row offers 'Enable' (not 'Disable') and 'Delete'.
    await sortQueuesNewestFirst(page);
    const queueRow = page.getByRole('row', { name: new RegExp(testData.QueueName) });
    await expect(queueRow).toBeVisible({ timeout: 30000 });
    await expect(queueRow.getByRole('cell', { name: testData.QueueName, exact: true })).toBeVisible();
    await expect(queueRow.getByRole('cell', { name: testData.QueueDescription, exact: true })).toBeVisible();
    await expect(queueRow.getByRole('button', { name: 'Enable' })).toBeVisible();
    await expect(queueRow.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('TC6290 Create a new queue schedule', { tag: ['@Smoke', '@Queue', '@Schedule', '@Administration'] }, async ({ page, testData }) => {
    // The Queues pages are slow to load and a page that has not loaded is reloaded up to 3 times (20s each), so allow
    // far more than the 30s default
    test.setTimeout(150000);

    // 1. Log in and open Administration > Queues
    // (the queue created by the setup is checked on the schedule page below, which lists every queue; the Queues
    // grid is paged at 10 per page and cannot be searched)
    const username = await login(page);
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add New Schedule' })).toBeVisible();

    // 2. Click 'Add New Schedule'; the 'Queues Schedule' page opens with an hourly trigger by default
    await page.getByRole('link', { name: 'Add New Schedule' }).click();
    await expect(page).toHaveURL(/#\/queueschedules/);
    await expect(page.getByRole('heading', { name: 'Queues Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Every hour' })).toBeVisible();
    await expect(page.getByText('No Queues Assigned')).toBeVisible();

    // 3. Enter the schedule name and description from the setup (first and second textbox on the page).
    // There is no Save button on this page: the schedule is saved automatically when the description field loses
    // focus, so press Tab on it. Once the schedule is saved the page shows its Author (the logged in user) - that
    // field only exists for a saved schedule - so wait for the Author before going on.
    // The page only accepts edits once its lists have loaded, so wait for the setup queue to be listed first.
    await reloadUntilVisible(page, page.getByRole('link', { name: testData.QueueName }));
    const nameBox = page.getByRole('textbox').nth(0);
    const descriptionBox = page.getByRole('textbox').nth(1);
    const author = page.locator('.form-group').filter({ has: page.locator('label', { hasText: 'Author' }) }).locator('.form-control');

    // Keep the schedule the server returns when it saves (it has the id used to reopen the schedule later)
    let savedSchedule: { Id: string; Description: string; Documentation: string } | undefined;
    page.on('response', async r => {
      if (/queueschedules/.test(r.url()) && r.request().method() !== 'GET' && r.ok()) {
        try {
          const body = await r.json();
          if (body && body.Id) {
            savedSchedule = body;
          }
        } catch {
          // not a JSON response
        }
      }
    });

    // The page occasionally misses an edit, so clear and re-enter the fields (up to 3 times) until the Author appears
    let authorShown = false;
    for (let attempt = 1; attempt <= 3 && !authorShown; attempt++) {
      await nameBox.fill('');
      await descriptionBox.fill('');
      await nameBox.fill(testData.ScheduleName);
      await descriptionBox.fill(testData.ScheduleDescription);
      await descriptionBox.press('Tab'); // leaving the description field saves the schedule
      await page.waitForTimeout(6000); // give the save time to finish and the Author to appear
      authorShown = await expect(author).toHaveText(username, { timeout: 10000 }).then(() => true, () => false);
    }
    await expect(author, 'the Author is shown once the schedule is saved').toHaveText(username);

    // The server returned the saved schedule: it has the name and description entered and an id
    await expect.poll(() => savedSchedule?.Id, { timeout: 10000 }).toBeDefined();
    expect(savedSchedule!.Description).toBe(testData.ScheduleName); // the UI 'Name' is stored as the task description
    expect(savedSchedule!.Documentation).toBe(testData.ScheduleDescription);
    const scheduleId = savedSchedule!.Id;

    // 4. Assign the setup queue: select it in the list of 'Queues' displayed; it moves to 'Queue Assignment'
    const queuesList = page.locator('div.col-md-6').filter({ has: page.getByRole('heading', { name: 'Queues', exact: true }) });
    const assignmentList = page.locator('div.col-md-6').filter({ has: page.getByRole('heading', { name: 'Queue Assignment' }) });
    await queuesList.getByRole('link', { name: testData.QueueName }).click();
    await page.waitForTimeout(5000); // give the assignment time to be saved and the lists to update
    await expect(assignmentList.getByText(testData.QueueName)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000); // let the assignment finish saving before leaving the page

    // 5. Reopen the saved schedule by its id and verify its name, description and hourly trigger.
    // (The 'Schedules' panel on the Queues page is not used: it pages its own request and does not always list a
    // new schedule.)
    // Go through the Queues page first: jumping straight from the new-schedule page to a saved schedule reuses the
    // same screen without reloading its data.
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    await page.goto(`#/queueschedules/${scheduleId}`);
    await reloadUntilVisible(page, page.getByRole('heading', { name: `Queues Schedule ${testData.ScheduleName}` }));
    await expect(page.getByRole('textbox').nth(0)).toHaveValue(testData.ScheduleName);
    await expect(page.getByRole('textbox').nth(1)).toHaveValue(testData.ScheduleDescription);
    await expect(page.getByRole('button', { name: 'Every hour' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Schedule' })).toBeEnabled();
  });
});

/**
 * Adds a task to the ticket that is currently open, using the Tasks tab, and returns once the task is saved.
 * The task form has no Save button: the task is created (POST /api/tickets/{id}/tasks) as soon as the title is filled
 * and later edits are saved automatically, so each step waits for the matching request to succeed.
 */
async function addTicketTask(page: Page, title: string, description: string, assignTo?: string): Promise<void> {
  const panel = page.getByRole('tabpanel');
  const taskField = (label: string) => panel.locator('.form-group').filter({ hasText: label }).getByRole('textbox');

  await page.getByRole('button', { name: 'Add Task' }).click();

  // Filling the title creates the task
  const created = page.waitForResponse(
    r => /\/tasks/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
    { timeout: 15000 }
  );
  await taskField('Title').fill(title);
  await created;

  // Filling the description saves the change to the task
  const updated = page.waitForResponse(
    r => /tasks?/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
    { timeout: 15000 }
  );
  await taskField('Description').fill(description);
  await taskField('Title').click(); // move focus off the description so the change is saved
  await updated;

  // Optionally assign the task: 'Assigned To' is a drop down (the first button in its group) listing the users.
  // NOTE: not yet verified against Orion - used only by TC6296, which is blocked.
  if (assignTo) {
    await panel.locator('.form-group').filter({ hasText: 'Assigned To' }).getByRole('button').first().click();
    await page.getByRole('link', { name: new RegExp(assignTo) }).first().click();
  }
}

test.describe('Ticket tasks', () => {
  test('TC6291 Create a new member ticket task', { tag: ['@Smoke', '@Member', '@Ticket', '@Task'] }, async ({ page, testData }) => {
    // The ticket and task are created through several slow pages; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in, note the number of tasks on Administration > Tasks as the baseline, then open Customer Service > My Tickets
    await login(page);
    await page.goto('#/tasks');
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible({ timeout: 20000 });
    const baselineTasks = await readCount(page, /Tasks?/);
    await page.goto('#/mytickets');
    await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();

    // 2. Add Ticket > Member Call. The ticket is created immediately and the URL changes to #/tickets/{id}
    await page.getByRole('link', { name: 'Add Ticket' }).click();
    await expect(page).toHaveURL(/#\/newticket/);
    await page.getByRole('button', { name: 'Member Call' }).click();

    await expect(page).toHaveURL(/#\/tickets\/\d+$/);
    const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];
    await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();

    // 3. Enter the caller and caller phone
    const callerBox = page.getByRole('textbox').first();
    await callerBox.fill(testData.Caller);
    await page.getByRole('textbox').nth(1).fill(testData.CallerPhone);
    await expect(callerBox).toHaveValue(testData.Caller);

    // 4. Search for the member created by the setup (submit with Enter) and select the match
    const memberSearch = page.getByRole('textbox', { name: 'search' });
    await memberSearch.fill(testData.SearchMemberName);
    await memberSearch.press('Enter');
    await page.getByRole('row', { name: new RegExp(testData.SearchMemberName) }).click();
    await expect(page.getByRole('link', { name: new RegExp(testData.ExpectedMemberNameInTab) })).toBeVisible();

    // 5. Open the Tasks tab; a new ticket has no tasks yet
    const tasksTab = page.getByRole('tablist').first().getByRole('link', { name: /Tasks/ });
    await tasksTab.click();
    await expect(tasksTab).toContainText('0');
    await expect(page.getByRole('heading', { name: 'No Tasks' })).toBeVisible();

    // 6. Add Task: enter the task title and description from the setup
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes);

    // 7. The Tasks tab now counts one task
    await expect(tasksTab).toContainText('1');

    // 8. Close the task form; the task is listed in the ticket's Tasks tab by its title
    await page.getByRole('tabpanel').getByRole('button').first().click();
    await expect(page.getByRole('tabpanel').getByRole('button', { name: testData.TaskTitle })).toBeVisible();

    // 9. Administration > Tasks lists all tasks: the task count is up by one
    // (the grid is paged, so verify the count rather than looking for the row)
    await page.goto('#/tasks');
    await expect(page.getByText(new RegExp(`(^|\\s)${baselineTasks + 1}\\s+Tasks?`)).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC6292 Create a new provider ticket task', { tag: ['@Smoke', '@Provider', '@Ticket', '@Task'] }, async ({ page, testData }) => {
    // The ticket and task are created through several slow pages; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in, note the number of tasks on Administration > Tasks as the baseline, then open Customer Service > My Tickets
    await login(page);
    await page.goto('#/tasks');
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible({ timeout: 20000 });
    const baselineTasks = await readCount(page, /Tasks?/);
    await page.goto('#/mytickets');
    await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();

    // 2. Add Ticket > Provider Call. The ticket is NOT created yet: the page stays on #/newticket and asks for a provider
    await page.getByRole('link', { name: 'Add Ticket' }).click();
    await expect(page).toHaveURL(/#\/newticket/);
    await page.getByRole('button', { name: 'Provider Call' }).click();
    const providerSearch = page.getByRole('textbox', { name: 'search' });
    await expect(providerSearch).toBeVisible();

    // 3. Enter the caller and caller phone
    const callerBox = page.getByRole('textbox').first();
    await callerBox.fill(testData.Caller);
    await page.getByRole('textbox').nth(1).fill(testData.CallerPhone);
    await expect(callerBox).toHaveValue(testData.Caller);

    // 4. Search for the provider created by the setup (submit with Enter) and select the match.
    // Selecting the provider creates the ticket and the URL changes to #/tickets/{id}
    await providerSearch.fill(testData.SearchProviderName);
    await providerSearch.press('Enter');
    await page.getByRole('row', { name: new RegExp(testData.SearchProviderName) }).click();
    await expect(page).toHaveURL(/#\/tickets\/\d+$/, { timeout: 15000 });
    const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];
    await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(testData.ExpectedProviderNameInTab) })).toBeVisible();

    // 5. Open the Tasks tab; a new ticket has no tasks yet
    const tasksTab = page.getByRole('tablist').first().getByRole('link', { name: /Tasks/ });
    await tasksTab.click();
    await expect(tasksTab).toContainText('0');
    await expect(page.getByRole('heading', { name: 'No Tasks' })).toBeVisible();

    // 6. Add Task: enter the task title and description from the setup
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes);

    // 7. The Tasks tab now counts one task
    await expect(tasksTab).toContainText('1');

    // 8. Close the task form; the task is listed in the ticket's Tasks tab by its title
    await page.getByRole('tabpanel').getByRole('button').first().click();
    await expect(page.getByRole('tabpanel').getByRole('button', { name: testData.TaskTitle })).toBeVisible();

    // 9. Administration > Tasks lists all tasks: the task count is up by one
    // (the grid is paged, so verify the count rather than looking for the row)
    await page.goto('#/tasks');
    await expect(page.getByText(new RegExp(`(^|\\s)${baselineTasks + 1}\\s+Tasks?`)).first()).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Claims queue', () => {
  test('TC6295 Create a queue, enable it and view it in My Claims Queue', { tag: ['@Smoke', '@Queue', '@Claims', '@Administration'] }, async ({ page, testData }) => {
    // Several slow pages and server-side reloads are involved; allow far more than the 30s default
    test.setTimeout(240000);

    // 1. Log in and open Administration > Queues
    const username = await login(page);
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

    // 2. Create the queue from the setup data and keep the id the server gives it
    await page.getByRole('button', { name: 'Add Queue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Queue' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.QueueName);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.QueueDescription);
    const saved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    const queueId = (await (await saved).json()).Id as number;
    await expect(dialog).toBeHidden();

    // 3. Enable the queue from the grid (a new queue starts disabled; newest first so it is on the first page)
    await sortQueuesNewestFirst(page);
    const queueRow = page.getByRole('row', { name: new RegExp(testData.QueueName) });
    await expect(queueRow).toBeVisible({ timeout: 30000 });
    await expect(queueRow.getByRole('button', { name: 'Enable' })).toBeVisible();
    await queueRow.getByRole('button', { name: 'Enable' }).click();
    await expect(queueRow.getByRole('button', { name: 'Disable' })).toBeVisible({ timeout: 30000 });

    // 4. Open the new queue by its id (opening it from the re-sorted grid is unreliable) and verify it is the right
    // one before changing anything on it
    await page.goto(`#/queues/${queueId}`);
    await expect(page.getByRole('heading', { name: `Queue ${testData.QueueName}` })).toBeVisible({ timeout: 30000 });

    // 5. Assignments: assign the queue to the logged in user. The My Claims Queue filter only lists queues the user
    // is assigned to.
    await page.getByRole('button', { name: 'Assignments' }).click();
    await expect(page.getByRole('heading', { name: 'Assigned Users / Groups' })).toBeVisible();
    const userButton = page.getByRole('button', { name: new RegExp(`^\\s*${username}`) });
    await expect(userButton).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1500); // let the users list finish rendering before clicking
    const assigned = page.waitForResponse(
      r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
      { timeout: 15000 }
    );
    await userButton.click();
    await assigned;
    await page.getByRole('button', { name: 'Close' }).click();

    // 6. Criteria: add a 'Claim Form Type' criterion of Professional. The My Claims Queue filter only lists queues
    // that hold claims, and the claims already in QC are professional claims.
    await page.getByRole('button', { name: 'Criteria' }).click();
    const criteria = page.getByRole('textbox', { name: 'filter criteria' });
    await expect(criteria).toBeVisible();
    await criteria.click();
    await criteria.pressSequentially('Claim Form', { delay: 80 });
    await page.getByRole('button', { name: 'Claim Form Type' }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    const criteriaRow = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Remove' }) });
    await expect(criteriaRow).toBeVisible();
    await criteriaRow.getByRole('cell').nth(1).getByRole('button').first().click(); // open the value drop down
    const criteriaSaved = page.waitForResponse(
      r => /queue/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
      { timeout: 15000 }
    );
    await page.getByRole('link', { name: 'Professional' }).click();
    await criteriaSaved;
    await page.getByRole('button', { name: 'Close' }).click();

    // 7. Reload the queue so the claims matching its criteria are added; it now holds claims
    await reloadCurrentQueue(page);
    await expect(page.getByText(/(^|\s)[1-9]\d*\s+Queue(\s|$)/).first()).toBeVisible({ timeout: 30000 });

    // 8. Open Claim Inventory Management > My Claims Queue
    await page.goto('#/myclaimsqueue');
    await expect(page.getByRole('heading', { name: 'Claims Queue' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Get Next Claim' })).toBeVisible();

    // 9. Open the 'Queue' filter drop down (the first button after the 'filters' heading) and verify the new queue
    // name is displayed in the list
    await page.getByRole('heading', { name: 'filters' }).locator('xpath=following::button[1]').click();
    await expect(page.locator('ul.dropdown-menu').getByText(testData.QueueName)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Queued claim task', () => {
  // The setup (Setups/TC6296.cs) creates and adjudicates a claim in QC (the QC DLLs match the QC database) and the test
  // uses the existing ALL CLAIMS queue. After the queues are reloaded the claim is found in My Claims Queue; clicking it
  // opens a panel on the left-hand side with a Tasks tab, where the task is added.
  test('TC6296 Create a queued claim task and view it in My Tasks', { tag: ['@Smoke', '@Queue', '@Claims', '@Task', '@Administration'] }, async ({ page, testData }) => {
    // Several slow pages and server-side reloads are involved; allow far more than the 30s default
    test.setTimeout(240000);

    // 1-6. Log in, select the existing ALL CLAIMS queue, assign it to the logged in user (if it is not already), add and remove a Dental claim form type
    // criterion, and reload the queues (shared function in utils/queues.ts)
    await reloadQueues(page, { name: testData.QueueName, description: testData.QueueDescription, create: false });

    // 7. Open My Claims Queue, search for the claim created by the setup and select it
    await page.goto('#/myclaimsqueue');
    await expect(page.getByRole('heading', { name: 'Claims Queue' })).toBeVisible({ timeout: 20000 });
    // Wait for the grid to finish loading its queue items before searching: a search typed while it is still loading
    // returns nothing
    // (the page keeps some widgets in a permanent loading state, so wait for rows and a positive item count instead)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(/[1-9]\d*\s+Queue Items/).first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(3000);
    const search = page.getByRole('textbox', { name: 'search' });
    const claimRow = page.getByRole('row', { name: new RegExp(testData.ClaimUD) });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await search.fill(testData.ClaimUD);
      await search.press('Enter');
      // The search takes several seconds to filter the grid
      const found = await expect(claimRow).toBeVisible({ timeout: 20000 }).then(() => true, () => false);
      if (found) {
        break;
      }
      await search.fill('');
      await search.press('Enter');
      await page.waitForTimeout(3000);
    }
    await expect(claimRow).toBeVisible({ timeout: 10000 });
    // Clicking the claim makes it active for the user and opens a panel on the left-hand side
    await claimRow.getByRole('cell', { name: testData.ClaimUD }).click();

    // 8. In the left-hand panel click the Tasks tab and add a task to the claim. The task is assigned to the logged in
    // user, because My Tasks only lists the user's own tasks.
    const tasksTab = page.getByRole('tablist').filter({ has: page.getByRole('link', { name: /Tasks/ }) }).first().getByRole('link', { name: /Tasks/ });
    await expect(tasksTab).toBeVisible({ timeout: 30000 });
    await tasksTab.click();
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes, process.env.ORION_USERNAME);

    // 9. Open My Tasks
    await page.goto('#/mytasks');

    // 10. The task is displayed on My Tasks. The page shows a placeholder '0 Tasks' until its data arrives (slowly), and
    // sometimes never loads, so reload it (up to 3 times, 30s each) until the task is listed.
    await reloadUntilVisible(page, page.getByText(testData.TaskTitle).first(), 3, 30000);
    await expect(page.getByText(/[1-9]\d*\s+Tasks?/).first()).toBeVisible();
  });
});

test.describe('About Orion', () => {
  test('TC6297 Open About Orion form', { tag: ['@Smoke', '@AboutOrion'] }, async ({ page, testData }) => {
    // 1. Log in to Orion
    await login(page);

    // 2. Click the profile icon in the top right corner; the profile menu opens with an 'About Orion' link
    await page.locator('a#main-user-status.dropdown-toggle').click();
    const aboutOrionLink = page.locator("a[data-target='#about-orion']").filter({ hasText: 'About Orion' });
    await expect(aboutOrionLink).toBeVisible();

    // 3. Select 'About Orion'; the About Orion popup opens with its table of component versions
    await aboutOrionLink.click();
    const aboutOrion = page.locator('#about-orion');
    await expect(aboutOrion).toBeVisible();
    await expect(aboutOrion.locator('.modal-title, h4').first()).toHaveText('About Orion');
    await expect(aboutOrion.locator('table.table-striped')).toBeVisible();

    // 4. Verify the version shown for each component against the expected value from the setup:
    //    the Worker Portal and API versions come from Get-Orion-Services-Versions.ps1,
    //    the Claims System version from the latest QC system update in the QC database.
    const versionOf = (component: string) =>
      aboutOrion.locator('tbody tr').filter({ has: page.locator('strong', { hasText: component }) }).locator('td').nth(1);

    await expect(versionOf('Orion Worker Portal'), 'Orion Worker Portal version').toHaveText(testData.OrionWorkerPortalVersion);
    await expect(versionOf('Authorizations API'), 'Authorizations API version').toHaveText(testData.AuthorizationsApiVersion);
    await expect(versionOf('Claims API'), 'Claims API version').toHaveText(testData.ClaimsApiVersion);
    await expect(versionOf('Enums API'), 'Enums API version').toHaveText(testData.EnumsApiVersion);
    await expect(versionOf('Members API'), 'Members API version').toHaveText(testData.MembersApiVersion);
    await expect(versionOf('Notes API'), 'Notes API version').toHaveText(testData.NotesApiVersion);
    await expect(versionOf('Providers API'), 'Providers API version').toHaveText(testData.ProvidersApiVersion);
    await expect(versionOf('Referrals API'), 'Referrals API version').toHaveText(testData.ReferralsApiVersion);
    await expect(versionOf('Storage API'), 'Storage API version').toHaveText(testData.StorageApiVersion);
    await expect(versionOf('Claims System'), 'Claims System version').toHaveText(testData.ClaimsSystemVersion);

    // 5. Close the popup
    await aboutOrion.locator('button.close').click();
    await expect(aboutOrion).toBeHidden();
  });
});
