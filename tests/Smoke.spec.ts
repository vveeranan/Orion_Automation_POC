// spec: specs/Smoke.md
// seed: tests/seed.spec.ts

import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/testData.fixture';
import { login } from '../utils/auth';
import { log } from '../utils/logger';
import { findQueueRow, readCount, reloadUntilVisible } from '../utils/grid';
import { createMemberCall } from '../utils/memberCall';
import { createProviderCall } from '../utils/providerCall';
import { assignQueueToUser, reloadCurrentQueue, reloadQueues, setClaimFormTypeCriterion } from '../utils/reloadQueues';
import { expectNewTicketListed } from '../utils/tickets';

test.describe('Ticket creation', () => {
  test('TC6286 Create a new member ticket', { tag: ['@Smoke', '@Member', '@Ticket'] }, async ({ page, testData }) => {
    // The ticket pages are slow to load; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in to Orion
    const username = await login(page);

    // 2-4. Member Call template (utils/memberCall.ts): open My Tickets and note the ticket count, create a Member Call
    // ticket, enter the caller and caller phone, then search for the member and select it
    const { ticketId, baseline } = await createMemberCall(page, {
      caller: testData.Caller,
      callerPhone: testData.CallerPhone,
      memberName: testData.SearchMemberName,
      expectedMemberNameInTab: testData.ExpectedMemberNameInTab,
    });

    // 5. Back on My Tickets the new ticket is listed first and the count is up by one
    await expectNewTicketListed(page, { baseline, ticketId, type: 'Member', caller: testData.Caller, username });
  });

  test('TC6287 Create a new provider ticket', { tag: ['@Smoke', '@Provider', '@Ticket'] }, async ({ page, testData }) => {
    // The ticket pages are slow to load; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in to Orion
    const username = await login(page);

    // 2-4. Provider Call template (utils/providerCall.ts): open My Tickets and note the ticket count, start a Provider
    // Call, enter the caller and caller phone, then search for the provider and select it (which creates the ticket)
    const { ticketId, baseline } = await createProviderCall(page, {
      caller: testData.Caller,
      callerPhone: testData.CallerPhone,
      providerName: testData.SearchProviderName,
      expectedProviderNameInTab: testData.ExpectedProviderNameInTab,
    });

    // 5. Back on My Tickets the new ticket is listed first and the count is up by one
    await expectNewTicketListed(page, { baseline, ticketId, type: 'Provider', caller: testData.Caller, username });
  });
});

test.describe('Administration', () => {
  test('TC6288 Create a new group', { tag: ['@Smoke', '@Group', '@Administration'] }, async ({ page, testData }) => {
    // 1. Log in and open Administration > Groups
    await login(page);
    log('Navigating to Administration > Groups');
    await page.goto('#/groups');
    await expect(page.getByRole('heading', { name: /Groups/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Group' })).toBeVisible();

    // Record the group count as the baseline (the grid may legitimately be empty, so do not wait for a row)
    const baseline = await readCount(page, /Groups?/);
    log(`Group count before adding the group: ${baseline}`);

    // 2. Click 'Add Group'; the 'Group' dialog opens with Name and Description fields
    log('Clicking Add Group button');
    await page.getByRole('button', { name: 'Add Group' }).click();
    log('Add Group dialog opened');
    const dialog = page.getByRole('dialog', { name: 'Group' });
    await expect(dialog).toBeVisible();

    // 3. Enter the group name and description from the setup and save, waiting for the save request to complete
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.GroupName);
    log(`Entered group name: ${testData.GroupName}`);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.GroupDescription);
    log(`Entered group description: ${testData.GroupDescription}`);
    const saved = page.waitForResponse(
      r => /\/groups/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    log('Group saved successfully');
    await saved;

    // 4. The dialog closes and the group count is up by one (the grid reloads slowly after saving)
    await expect(dialog).toBeHidden();
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Groups?`)).first()).toBeVisible({ timeout: 30000 });
    log(`Group count is up by one: ${baseline + 1}`);

    // 5. Search for the group (the grid is paged at 10 per page, so do not rely on it being on the first page) and
    // verify its name and description are listed. The search takes a few seconds to filter the grid.
    const search = page.getByRole('textbox', { name: 'search' });
    log(`Searching for group ${testData.GroupName}`);
    await search.fill(testData.GroupName);
    await search.press('Enter');
    const groupRow = page.getByRole('row', { name: new RegExp(testData.GroupName) });
    await expect(groupRow).toBeVisible({ timeout: 30000 });
    await expect(groupRow.getByRole('cell', { name: testData.GroupName, exact: true })).toBeVisible();
    await expect(groupRow.getByRole('cell', { name: testData.GroupDescription, exact: true })).toBeVisible();
    log(`Group ${testData.GroupName} is listed with its name and description`);
  });

  test('TC6289 Create a new queue', { tag: ['@Smoke', '@Queue', '@Administration'] }, async ({ page, testData }) => {
    // The Queues grid reloads slowly after saving and sorting; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in and open Administration > Queues
    await login(page);
    log('Navigating to Administration > Queues');
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

    // Record the queue count as the baseline (wait for grid data so the count is loaded)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
    const baseline = await readCount(page, /Queues?/);
    log(`Queue count before adding the queue: ${baseline}`);

    // 2. Click 'Add Queue'; the 'Queue' dialog opens with Name and Description fields
    log('Clicking Add Queue button');
    await page.getByRole('button', { name: 'Add Queue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Queue' });
    await expect(dialog).toBeVisible();

    // 3. Enter the queue name and description from the setup and save, waiting for the save request to complete
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.QueueName);
    log(`Entered queue name: ${testData.QueueName}`);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.QueueDescription);
    log(`Entered queue description: ${testData.QueueDescription}`);
    const saved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    log('Queue saved successfully');
    await saved;

    // 4. The dialog closes and the queue count is up by one
    await expect(dialog).toBeHidden();
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Queues?`)).first()).toBeVisible({ timeout: 30000 });
    log(`Queue count is up by one: ${baseline + 1}`);

    // 5. Verify the new queue is listed with its name and description.
    // The grid shows 10 queues per page and its search box does not filter, so sort by ID descending (newest first).
    // A queue created from the UI starts disabled, so the row offers 'Enable' (not 'Disable') and 'Delete'.
    const queueRow = await findQueueRow(page, testData.QueueName);
    await expect(queueRow.getByRole('cell', { name: testData.QueueName, exact: true })).toBeVisible();
    await expect(queueRow.getByRole('cell', { name: testData.QueueDescription, exact: true })).toBeVisible();
    await expect(queueRow.getByRole('button', { name: 'Enable' })).toBeVisible();
    await expect(queueRow.getByRole('button', { name: 'Delete' })).toBeVisible();
    log(`Queue ${testData.QueueName} is listed with its name and description and offers Enable and Delete`);
  });

  test('TC6290 Create a new queue schedule', { tag: ['@Smoke', '@Queue', '@Schedule', '@Administration'] }, async ({ page, testData }) => {
    // The Queues pages are slow to load and a page that has not loaded is reloaded up to 3 times (20s each), so allow
    // far more than the 30s default
    test.setTimeout(150000);

    // 1. Log in and open Administration > Queues
    // (the queue created by the setup is checked on the schedule page below, which lists every queue; the Queues
    // grid is paged at 10 per page and cannot be searched)
    const username = await login(page);
    log('Navigating to Administration > Queues');
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add New Schedule' })).toBeVisible();

    // 2. Click 'Add New Schedule'; the 'Queues Schedule' page opens with an hourly trigger by default
    log('Clicking Add New Schedule link');
    await page.getByRole('link', { name: 'Add New Schedule' }).click();
    await expect(page).toHaveURL(/#\/queueschedules/);
    await expect(page.getByRole('heading', { name: 'Queues Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Every hour' })).toBeVisible();
    await expect(page.getByText('No Queues Assigned')).toBeVisible();
    log('Queues Schedule page opened with an hourly trigger');

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
      log(`Entering schedule name: ${testData.ScheduleName} (attempt ${attempt})`);
      await nameBox.fill(testData.ScheduleName);
      await descriptionBox.fill(testData.ScheduleDescription);
      await descriptionBox.press('Tab'); // leaving the description field saves the schedule
      await page.waitForTimeout(6000); // give the save time to finish and the Author to appear
      authorShown = await expect(author).toHaveText(username, { timeout: 10000 }).then(() => true, () => false);
    }
    await expect(author, 'the Author is shown once the schedule is saved').toHaveText(username);
    log(`Schedule saved; Author shown: ${username}`);

    // The server returned the saved schedule: it has the name and description entered and an id
    await expect.poll(() => savedSchedule?.Id, { timeout: 10000 }).toBeDefined();
    expect(savedSchedule!.Description).toBe(testData.ScheduleName); // the UI 'Name' is stored as the task description
    expect(savedSchedule!.Documentation).toBe(testData.ScheduleDescription);
    const scheduleId = savedSchedule!.Id;
    log(`Schedule saved with id ${scheduleId}`);

    // 4. Assign the setup queue: select it in the list of 'Queues' displayed; it moves to 'Queue Assignment'
    const queuesList = page.locator('div.col-md-6').filter({ has: page.getByRole('heading', { name: 'Queues', exact: true }) });
    const assignmentList = page.locator('div.col-md-6').filter({ has: page.getByRole('heading', { name: 'Queue Assignment' }) });
    await page.waitForTimeout(3000); // the page re-renders after the save (the Author appears); let it settle first
    const queueLink = queuesList.getByRole('link', { name: testData.QueueName });
    for (let attempt = 1; attempt <= 3; attempt++) {
      // A click made while the page is still re-rendering can be lost. Click again only while the queue is still in the
      // 'Queues' list: once it has moved to 'Queue Assignment' it is no longer there, so a repeat click cannot undo it.
      if (await queueLink.isVisible()) {
        await queueLink.click();
      }
      await page.waitForTimeout(5000); // give the assignment time to be saved and the lists to update
      if (await assignmentList.getByText(testData.QueueName).isVisible()) {
        break;
      }
    }
    await expect(assignmentList.getByText(testData.QueueName)).toBeVisible({ timeout: 15000 });
    log(`Queue ${testData.QueueName} assigned to the schedule`);
    await page.waitForTimeout(3000); // let the assignment finish saving before leaving the page

    // 5. Reopen the saved schedule by its id and verify its name, description and hourly trigger.
    // (The 'Schedules' panel on the Queues page is not used: it pages its own request and does not always list a
    // new schedule.)
    // Go through the Queues page first: jumping straight from the new-schedule page to a saved schedule reuses the
    // same screen without reloading its data.
    log('Navigating to Administration > Queues');
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    log(`Reopening saved schedule ${scheduleId}`);
    await page.goto(`#/queueschedules/${scheduleId}`);
    await reloadUntilVisible(page, page.getByRole('heading', { name: `Queues Schedule ${testData.ScheduleName}` }));
    await expect(page.getByRole('textbox').nth(0)).toHaveValue(testData.ScheduleName);
    await expect(page.getByRole('textbox').nth(1)).toHaveValue(testData.ScheduleDescription);
    await expect(page.getByRole('button', { name: 'Every hour' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Schedule' })).toBeEnabled();
    log('Schedule name, description and hourly trigger verified');
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

  // The click on 'Add Task' is sometimes missed while the panel is still loading. Click it again only while the task
  // form (its Title box) is not showing, so a second form is never opened.
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (!(await taskField('Title').isVisible())) {
      await page.getByRole('button', { name: 'Add Task' }).click();
    }
    const formOpen = await expect(taskField('Title')).toBeVisible({ timeout: 15000 }).then(() => true, () => false);
    if (formOpen) {
      break;
    }
  }
  await expect(taskField('Title')).toBeVisible({ timeout: 10000 });

  // Filling the title creates the task
  const created = page.waitForResponse(
    r => /\/tasks/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
    { timeout: 15000 }
  );
  await taskField('Title').fill(title);
  await created;
  log('Task created');

  // Filling the description saves the change to the task
  const updated = page.waitForResponse(
    r => /tasks?/i.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
    { timeout: 15000 }
  );
  await taskField('Description').fill(description);
  await taskField('Title').click(); // move focus off the description so the change is saved
  await updated;
  log('Task description saved');

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

    // 1. Log in and note the number of tasks on Administration > Tasks as the baseline
    await login(page);
    log('Navigating to Administration > Tasks');
    await page.goto('#/tasks');
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible({ timeout: 20000 });
    const baselineTasks = await readCount(page, /Tasks?/);
    log(`Task count before adding the task: ${baselineTasks}`);

    // 2-4. Member Call template (utils/memberCall.ts): open My Tickets, create a Member Call ticket, enter the caller
    // and caller phone, then search for the member and select it
    await createMemberCall(page, {
      caller: testData.Caller,
      callerPhone: testData.CallerPhone,
      memberName: testData.SearchMemberName,
      expectedMemberNameInTab: testData.ExpectedMemberNameInTab,
    });

    // 5. Open the Tasks tab; a new ticket has no tasks yet
    const tasksTab = page.getByRole('tablist').first().getByRole('link', { name: /Tasks/ });
    await tasksTab.click();
    await expect(tasksTab).toContainText('0');
    await expect(page.getByRole('heading', { name: 'No Tasks' })).toBeVisible();
    log('Tasks tab opened; the new ticket has no tasks');

    // 6. Add Task: enter the task title and description from the setup
    log(`Adding task: ${testData.TaskTitle}`);
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes);

    // 7. The Tasks tab now counts one task
    await expect(tasksTab).toContainText('1');
    log('Tasks tab now counts one task');

    // 8. Close the task form; the task is listed in the ticket's Tasks tab by its title
    await page.getByRole('tabpanel').getByRole('button').first().click();
    await expect(page.getByRole('tabpanel').getByRole('button', { name: testData.TaskTitle })).toBeVisible();
    log(`Task ${testData.TaskTitle} is listed in the ticket's Tasks tab`);

    // 9. Administration > Tasks lists all tasks: the task count is up by one
    // (the grid is paged, so verify the count rather than looking for the row)
    await page.goto('#/tasks');
    await expect(page.getByText(new RegExp(`(^|\\s)${baselineTasks + 1}\\s+Tasks?`)).first()).toBeVisible({ timeout: 20000 });
    log(`Administration > Tasks count is up by one: ${baselineTasks + 1}`);
  });

  test('TC6292 Create a new provider ticket task', { tag: ['@Smoke', '@Provider', '@Ticket', '@Task'] }, async ({ page, testData }) => {
    // The ticket and task are created through several slow pages; allow more than the 30s default
    test.setTimeout(90000);

    // 1. Log in and note the number of tasks on Administration > Tasks as the baseline
    await login(page);
    log('Navigating to Administration > Tasks');
    await page.goto('#/tasks');
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible({ timeout: 20000 });
    const baselineTasks = await readCount(page, /Tasks?/);
    log(`Task count before adding the task: ${baselineTasks}`);

    // 2-4. Provider Call template (utils/providerCall.ts): open My Tickets, start a Provider Call, enter the caller and
    // caller phone, then search for the provider and select it (which creates the ticket)
    await createProviderCall(page, {
      caller: testData.Caller,
      callerPhone: testData.CallerPhone,
      providerName: testData.SearchProviderName,
      expectedProviderNameInTab: testData.ExpectedProviderNameInTab,
    });

    // 5. Open the Tasks tab; a new ticket has no tasks yet
    const tasksTab = page.getByRole('tablist').first().getByRole('link', { name: /Tasks/ });
    await tasksTab.click();
    await expect(tasksTab).toContainText('0');
    await expect(page.getByRole('heading', { name: 'No Tasks' })).toBeVisible();
    log('Tasks tab opened; the new ticket has no tasks');

    // 6. Add Task: enter the task title and description from the setup
    log(`Adding task: ${testData.TaskTitle}`);
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes);

    // 7. The Tasks tab now counts one task
    await expect(tasksTab).toContainText('1');
    log('Tasks tab now counts one task');

    // 8. Close the task form; the task is listed in the ticket's Tasks tab by its title
    await page.getByRole('tabpanel').getByRole('button').first().click();
    await expect(page.getByRole('tabpanel').getByRole('button', { name: testData.TaskTitle })).toBeVisible();
    log(`Task ${testData.TaskTitle} is listed in the ticket's Tasks tab`);

    // 9. Administration > Tasks lists all tasks: the task count is up by one
    // (the grid is paged, so verify the count rather than looking for the row)
    await page.goto('#/tasks');
    await expect(page.getByText(new RegExp(`(^|\\s)${baselineTasks + 1}\\s+Tasks?`)).first()).toBeVisible({ timeout: 20000 });
    log(`Administration > Tasks count is up by one: ${baselineTasks + 1}`);
  });
});

test.describe('Claims queue', () => {
  test('TC6295 Create a queue, enable it and view it in My Claims Queue', { tag: ['@Smoke', '@Queue', '@Claims', '@Administration'] }, async ({ page, testData }) => {
    // Several slow pages and server-side reloads are involved; allow far more than the 30s default
    test.setTimeout(240000);

    // 1. Log in and open Administration > Queues
    const username = await login(page);
    log('Navigating to Administration > Queues');
    await page.goto('#/queues');
    await expect(page.getByRole('heading', { name: 'Queues' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Queue' })).toBeVisible();

    // 2. Create the queue from the setup data and keep the id the server gives it
    log('Clicking Add Queue button');
    await page.getByRole('button', { name: 'Add Queue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Queue' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(testData.QueueName);
    log(`Entered queue name: ${testData.QueueName}`);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(testData.QueueDescription);
    log(`Entered queue description: ${testData.QueueDescription}`);
    const saved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    const queueId = (await (await saved).json()).Id as number;
    log(`Queue ${testData.QueueName} created with id ${queueId}`);
    await expect(dialog).toBeHidden();

    // 3. Enable the queue from the grid (a new queue starts disabled; newest first so it is on the first page)
    const queueRow = await findQueueRow(page, testData.QueueName);
    await expect(queueRow.getByRole('button', { name: 'Enable' })).toBeVisible();
    // Wait for the server to accept the change: the row switches to 'Disable' straight away even if the change was not
    // saved, and a queue that was never really enabled cannot be reloaded (the server fails with 'Nullable object must
    // have a value').
    const enableSaved = page.waitForResponse(
      r => /\/queues/.test(r.url()) && r.request().method() !== 'GET' && r.ok(),
      { timeout: 20000 }
    );
    log(`Enabling queue ${testData.QueueName}`);
    await queueRow.getByRole('button', { name: 'Enable' }).click();
    await enableSaved;
    await expect(queueRow.getByRole('button', { name: 'Disable' })).toBeVisible({ timeout: 30000 });
    log('Queue enabled');
    await page.waitForTimeout(3000); // let the change settle before leaving the grid

    // 4. Open the new queue by its id (opening it from the re-sorted grid is unreliable) and verify it is the right
    // one before changing anything on it
    await page.goto(`#/queues/${queueId}`);
    await reloadUntilVisible(page, page.getByRole('heading', { name: `Queue ${testData.QueueName}` }), 3, 30000);

    // 5. Assignments: assign the queue to the logged in user. The My Claims Queue filter only lists queues the user
    // is assigned to.
    log(`Assigning the queue to ${username}`);
    await assignQueueToUser(page, username);

    // 6. Criteria: add a 'Claim Form Type' criterion of Professional. The My Claims Queue filter only lists queues
    // that hold claims, and the claims already in QC are professional claims.
    log('Adding Claim Form Type criterion: Professional');
    await setClaimFormTypeCriterion(page, 'Professional');

    // 7. Reload the queue so the claims matching its criteria are added; it now holds claims
    log('Reloading the queue so matching claims are added');
    await reloadCurrentQueue(page);
    // (the count fills in slowly after a reload, so reload the page if it has not shown up within 30 seconds)
    await reloadUntilVisible(page, page.getByText(/(^|\s)[1-9]\d*\s+Queue(\s|$)/).first(), 3, 30000);

    // 8. Open Claim Inventory Management > My Claims Queue
    log('Navigating to Claim Inventory Management > My Claims Queue');
    await page.goto('#/myclaimsqueue');
    await expect(page.getByRole('heading', { name: 'Claims Queue' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Get Next Claim' })).toBeVisible();

    // 9. Open the 'Queue' filter drop down (the first button after the 'filters' heading) and verify the new queue
    // name is displayed in the list
    await page.getByRole('heading', { name: 'filters' }).locator('xpath=following::button[1]').click();
    await expect(page.locator('ul.dropdown-menu').getByText(testData.QueueName)).toBeVisible({ timeout: 15000 });
    log(`Queue ${testData.QueueName} is displayed in the Queue filter list`);
  });
});

test.describe('Queued claim task', () => {
  // The setup (Setups/TC6296.cs) creates and adjudicates a claim in QC (the QC DLLs match the QC database) and the test
  // uses the existing ALL CLAIMS queue. After the queues are reloaded the claim is found in My Claims Queue; clicking it
  // opens a panel on the left-hand side with a Tasks tab, where the task is added.
  test('TC6296 Create a queued claim task and view it in My Tasks', { tag: ['@Smoke', '@Queue', '@Claims', '@Task', '@Administration'] }, async ({ page, testData }) => {
    // This is the longest test: several slow pages, server-side reloads and pages that are reloaded when their data
    // does not arrive. Allow far more than the 30s default (8 minutes).
    test.setTimeout(480000);

    // 1-6. Log in, select the existing ALL CLAIMS queue, assign it to the logged in user (if it is not already), add and remove a Dental claim form type
    // criterion, and reload the queues (shared function in utils/queues.ts)
    await reloadQueues(page, { name: testData.QueueName, description: testData.QueueDescription, create: false });
    log('Queues reloaded');

    // Note how many tasks My Tasks lists before the task is added (the grid is paged at 10 rows and the user's tasks
    // keep growing, so the new task is checked by the count going up rather than by finding its row)
    await page.goto('#/mytasks');
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible({ timeout: 20000 });
    const baselineMyTasks = await readCount(page, /Tasks?/);
    log(`My Tasks count before adding the task: ${baselineMyTasks}`);

    // 7. Open My Claims Queue, search for the claim created by the setup and select it
    log('Navigating to My Claims Queue');
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
    log(`Selecting claim ${testData.ClaimUD}`);
    await claimRow.getByRole('cell', { name: testData.ClaimUD }).click();

    // 8. In the left-hand panel click the Tasks tab and add a task to the claim. The task is assigned to the logged in
    // user, because My Tasks only lists the user's own tasks.
    const tasksTab = page.getByRole('tablist').filter({ has: page.getByRole('link', { name: /Tasks/ }) }).first().getByRole('link', { name: /Tasks/ });
    await expect(tasksTab).toBeVisible({ timeout: 30000 });
    log('Opening the Tasks tab on the claim');
    await tasksTab.click();
    await addTicketTask(page, testData.TaskTitle, testData.TaskNotes, process.env.ORION_USERNAME);

    // 9. Open My Tasks
    log('Navigating to My Tasks');
    await page.goto('#/mytasks');

    // 10. The task is listed on My Tasks: the count is up by one. The page shows a placeholder '0 Tasks' until its data
    // arrives (slowly), and sometimes never loads, so reload it (up to 3 times, 30s each) until the new count shows.
    await reloadUntilVisible(page, page.getByText(new RegExp(`(^|\\s)${baselineMyTasks + 1}\\s+Tasks?`)).first(), 3, 30000);
    log(`My Tasks count is up by one: ${baselineMyTasks + 1}`);
  });
});

test.describe('About Orion', () => {
  test('TC6297 Open About Orion form', { tag: ['@Smoke', '@AboutOrion'] }, async ({ page, testData }) => {
    // 1. Log in to Orion
    await login(page);

    // 2. Click the profile icon in the top right corner; the profile menu opens with an 'About Orion' link
    log('Clicking the profile icon');
    await page.locator('a#main-user-status.dropdown-toggle').click();
    const aboutOrionLink = page.locator("a[data-target='#about-orion']").filter({ hasText: 'About Orion' });
    await expect(aboutOrionLink).toBeVisible();
    log('Profile menu opened with the About Orion link');

    // 3. Select 'About Orion'; the About Orion popup opens with its table of component versions
    log('Selecting About Orion');
    await aboutOrionLink.click();
    const aboutOrion = page.locator('#about-orion');
    await expect(aboutOrion).toBeVisible();
    await expect(aboutOrion.locator('.modal-title, h4').first()).toHaveText('About Orion');
    await expect(aboutOrion.locator('table.table-striped')).toBeVisible();
    log('About Orion popup opened with its table of component versions');

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
    log('Component versions verified against the expected values');

    // 5. Close the popup
    log('Closing the About Orion popup');
    await aboutOrion.locator('button.close').click();
    await expect(aboutOrion).toBeHidden();
    log('About Orion popup closed');
  });
});
