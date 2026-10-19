import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { log } from './logger';

/**
 * Helpers for the KPI feature (RT:27053): the Group KPIs configuration tab, the KPI ribbon shown on Tickets and Claims
 * Queue, the KPI Information dialog and the KPI Settings (refresh interval) dialog. Shared by every spec that needs KPIs.
 *
 * KPI configuration is stored per group: the test assigns the logged in user to a group created by its setup, configures
 * the KPI on that group and then looks at the ribbon. Every assignment is registered here so cleanupKpiGroups() can take
 * the user out of the group again, which keeps one test's KPIs from appearing in another test's ribbon.
 */

/** Customer Service KPIs (the ribbon on the Tickets page), as named on the Group KPIs tab. */
export const CUSTOMER_SERVICE_KPIS = ['Resolution Time', 'Tickets Created', 'Tickets Resolved', 'Tickets Close Rate'];

/** Claims Processing KPIs (the ribbon on the Claims Queue page), as named on the Group KPIs tab. */
export const CLAIMS_PROCESSING_KPIS = [
  'Average Claim Resolution Time',
  'Claims Pending',
  'Claims Worked',
  'Claims Resolved',
  'Claims Delegated',
  'Claim Wait Time',
];

/** The id the Orion API uses for each KPI (also the key prefix of its group configuration). */
export const KPI_ID: Record<string, string> = {
  'Resolution Time': 'KPI_DISPLAY_AVERAGE_TICKET_RESOLUTION_TIME',
  'Tickets Created': 'KPI_DISPLAY_TICKETS_CREATED',
  'Tickets Resolved': 'KPI_DISPLAY_TICKETS_RESOLVED',
  'Tickets Close Rate': 'KPI_DISPLAY_TICKETS_CLOSE_RATE',
  'Average Claim Resolution Time': 'KPI_DISPLAY_AVERAGE_CLAIM_RESOLUTION_TIME',
  'Claims Pending': 'KPI_DISPLAY_CLAIMS_PENDING',
  'Claims Worked': 'KPI_DISPLAY_CLAIMS_WORKED',
  'Claims Resolved': 'KPI_DISPLAY_CLAIMS_RESOLVED',
  'Claims Delegated': 'KPI_DISPLAY_CLAIMS_DELEGATED',
  'Claim Wait Time': 'KPI_DISPLAY_CLAIM_WAIT_TIME',
};

export type KpiConfig = {
  benchmark?: 'More' | 'Less';
  value?: string;
  period?: 'Current Day' | 'Current Week' | 'Current Month' | 'Last 24 Hours';
  display?: 'Three Bar Graph' | 'Ticker';
};

/** The two pages that show a KPI ribbon, with the API call that fetches the ribbon's results. */
const RIBBON_PAGES = {
  tickets: { route: '#/mytickets', api: /\/api\/kpis\/customerservice/ },
  claims: { route: '#/myclaimsqueue', api: /\/api\/kpis\/claimsprocessing/ },
};
export type RibbonPage = keyof typeof RIBBON_PAGES;

/** A result as the KPI API returns it (one per enabled KPI). */
export type KpiResult = {
  Id: string;
  Type: 'ticker' | 'threebargraph';
  UserId: string;
  GroupId: number;
  GroupName: string;
  GroupResult: number;
  UserResult: number;
  Benchmark: 'more' | 'less' | null;
  BenchmarkResult: number | null;
  TimePeriod: string | null;
  LastUpdated: string;
};

// ---------------------------------------------------------------------------------------------------------------------
// Group: open, assign the user, clean up
// ---------------------------------------------------------------------------------------------------------------------

const assignedGroups: { id: number; username: string }[] = [];

/**
 * Administration > Groups: searches for the group and opens it. The user must already be logged in.
 * @returns the id of the group (from its #/groups/{id} route)
 */
export async function openGroup(page: Page, groupName: string): Promise<number> {
  log(`Navigating to Administration > Groups to open ${groupName}`);
  const row = page.getByRole('row', { name: new RegExp(groupName) });
  // The Groups grid sometimes does not filter (the backend is slow), so repeat the search (up to 3 times, reloading the
  // page in between). Nothing has been changed yet, so reloading is safe.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('#/groups');
    if (attempt > 1) {
      await page.reload();
    }
    await expect(page.getByRole('heading', { name: /Groups/ })).toBeVisible({ timeout: 30000 });
    const search = page.getByRole('textbox', { name: 'search' });
    await search.fill(groupName);
    await search.press('Enter');
    const found = await expect(row).toBeVisible({ timeout: attempt < 3 ? 12000 : 30000 }).then(() => true, () => false);
    if (found) {
      break;
    }
    if (attempt === 3) {
      log(`The group ${groupName} was not found in the Groups grid`, 'Error');
      throw new Error(`The group ${groupName} was not found in the Groups grid`);
    }
    log(`Group ${groupName} not listed (attempt ${attempt} of 3); searching again`, 'Error');
  }
  await row.getByRole('cell', { name: groupName, exact: true }).click();
  await expect(page).toHaveURL(/#\/groups\/\d+$/, { timeout: 20000 });
  const id = Number(page.url().match(/#\/groups\/(\d+)$/)![1]);
  await expect(page.getByRole('link', { name: 'Group KPIs' })).toBeVisible({ timeout: 30000 });
  log(`Group ${groupName} opened (id ${id})`);
  return id;
}

/**
 * Group Assignments tab of the open group: assigns the user by clicking them in the 'Users' list (a click on an assigned
 * user would remove them, so this is only for a user that is not yet in the group, as in a group created by the setup).
 * The assignment is remembered so cleanupKpiGroups() can remove it.
 */
export async function assignUserToGroup(page: Page, groupId: number, username: string): Promise<void> {
  log(`Assigning ${username} to group ${groupId}`);
  const user = page.getByRole('link', { name: new RegExp(`^\\s*${username}`) });
  await expect(user).toBeVisible({ timeout: 30000 }); // the users list loads after the page
  const saved = page.waitForResponse(
    r => new RegExp(`/api/groups/${groupId}/users`).test(r.url()) && r.request().method() === 'POST' && r.ok(),
    { timeout: 20000 }
  );
  await user.click();
  await saved;
  assignedGroups.push({ id: groupId, username });
  log(`User ${username} assigned to group ${groupId}`);
}

/** True when the user is in the open group's 'Assigned' list (a user in the 'Users' list is not assigned). */
async function isUserAssigned(page: Page, username: string): Promise<boolean> {
  return page.evaluate(user => {
    const heading = [...document.querySelectorAll('h4')].find(h => h.textContent?.trim() === 'Assigned');
    let node: Element | null = heading ?? null;
    while (node?.parentElement) {
      node = node.parentElement;
      // Stop once the container holds the other sections too: the Assigned list is not inside it
      if (node.querySelectorAll('h4').length > 1) {
        return false;
      }
      if (node.textContent?.includes(user)) {
        return true;
      }
    }
    return false;
  }, username);
}

/**
 * Takes the user out of every group a test assigned them to (call from afterEach), so the next test's ribbon only shows
 * its own KPIs. Best effort: a failure here is logged and never hides the result of the test itself. A user is only
 * clicked while they are in the 'Assigned' list, because a click on an unassigned user would assign them.
 */
export async function cleanupKpiGroups(page: Page): Promise<void> {
  while (assignedGroups.length > 0) {
    const { id, username } = assignedGroups.pop()!;
    try {
      // Go through the Groups list: moving straight from one group to another keeps showing the first group
      await page.goto('#/groups');
      await dismissLeaveGroupConfirm(page);
      await expect(page.getByRole('heading', { name: /Groups/ })).toBeVisible({ timeout: 30000 });
      await page.goto(`#/groups/${id}`);
      const user = page.getByRole('link', { name: new RegExp(`^\\s*${username}`) }).first();
      await expect(user).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(1500); // let the Assigned and Users lists settle
      if (!(await isUserAssigned(page, username))) {
        log(`Cleanup: ${username} is not assigned to group ${id}`);
        continue;
      }
      const removed = page.waitForResponse(
        r => new RegExp(`/api/groups/${id}/users/`).test(r.url()) && r.request().method() === 'DELETE' && r.ok(),
        { timeout: 20000 }
      );
      await user.click();
      await removed;
      log(`Cleanup: removed ${username} from group ${id}`);
    } catch (error) {
      log(`Cleanup: could not remove ${username} from group ${id}: ${error}`, 'Error');
    }
  }
}

/**
 * A group with no flags asks 'No group flags are selected ... Continue?' when the user leaves its page. The test is not
 * about flags, so continue. Waits briefly for the confirmation: it is not always shown.
 */
export async function dismissLeaveGroupConfirm(page: Page): Promise<void> {
  const proceed = page.getByRole('button', { name: 'Proceed' });
  if (await proceed.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)) {
    await proceed.click();
    log("Dismissed the 'No group flags are selected' confirmation with Proceed");
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Group KPIs tab
// ---------------------------------------------------------------------------------------------------------------------

/** Opens the Group KPIs tab of the open group and waits for the KPI lists. */
export async function openGroupKpis(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Group KPIs' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Service KPIs' })).toBeVisible({ timeout: 20000 });
}

/** The row of a KPI in the Group KPIs lists (matched by its exact name: 'Resolution Time' is also in a Claims KPI name). */
export function kpiItem(page: Page, kpiName: string): Locator {
  return page.locator('.kpi-item').filter({ has: page.getByText(kpiName, { exact: true }) });
}

/** Waits for the group configuration save the editor/list sends (POST /api/groups/{id}/configuration) for a KPI key. */
function configurationSaved(page: Page, kpiName: string, keySuffix = '', value?: string, timeout = 20000) {
  const key = `${KPI_ID[kpiName]}${keySuffix}`;
  return page.waitForResponse(
    r =>
      /\/api\/groups\/\d+\/configuration/.test(r.url()) &&
      r.request().method() === 'POST' &&
      (r.request().postData() ?? '').includes(`"Key":"${key}"`) &&
      (value === undefined || (r.request().postData() ?? '').includes(`"Value":"${value}"`)),
    { timeout }
  );
}

/**
 * Makes one change in the KPI editor and waits for it to be saved. The editor re-renders after every save, which can
 * swallow the next click or selection, so when nothing was saved within 20 seconds the change is made again (up to 3
 * times in all). Repeating a change that did not save cannot undo anything.
 */
async function changeKpi(
  page: Page,
  kpiName: string,
  keySuffix: string,
  value: string | undefined,
  change: () => Promise<void>
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const saved = configurationSaved(page, kpiName, keySuffix, value, 20000);
    saved.catch(() => undefined); // a timed out wait must not surface as an unhandled rejection
    await change();
    const response = await saved.catch(() => undefined);
    if (response?.ok()) {
      return;
    }
    log(
      response
        ? `${kpiName}${keySuffix} was refused by the server (HTTP ${response.status()}) (attempt ${attempt} of 3); repeating the change`
        : `${kpiName}${keySuffix} got no save response in 20s (attempt ${attempt} of 3); repeating the change`,
      'Error'
    );
  }
  throw new Error(`${kpiName}${keySuffix} was not saved`);
}

/**
 * Clicks an element of the Group KPIs list. The list is sometimes re-rendered over and over, so a normal click keeps
 * finding its element 'detached from the DOM' and retries until the test times out. So the click gets 8 seconds and, if
 * the element never holds still, the click event is dispatched straight to whichever element is there at that moment.
 */
async function clickInKpiList(target: Locator): Promise<void> {
  try {
    await target.click({ timeout: 8000 });
  } catch {
    log('The KPI list kept re-rendering; dispatching the click directly', 'Error');
    await target.dispatchEvent('click', undefined, { timeout: 8000 });
  }
}

/**
 * Clicks Enable on a KPI and waits for the save. The click is repeated if nothing was saved in 20 seconds, but only while
 * the button still says Enable (a save that arrived late has already turned it into Disable).
 */
export async function enableKpi(page: Page, kpiName: string): Promise<void> {
  log(`Enabling KPI ${kpiName}`);
  const enable = kpiItem(page, kpiName).getByRole('button', { name: 'Enable' });
  if (await kpiItem(page, kpiName).getByRole('button', { name: 'Disable' }).isVisible()) {
    log(`KPI ${kpiName} is already enabled`);
    return;
  }
  await changeKpi(page, kpiName, '', 'enabled', async () => {
    if (await enable.isVisible()) {
      await clickInKpiList(enable);
    }
  });
  await expect(kpiItem(page, kpiName).getByRole('button', { name: 'Disable' })).toBeVisible();
}

/** Clicks Disable on a KPI and waits for the save (repeated like enableKpi). */
export async function disableKpi(page: Page, kpiName: string): Promise<void> {
  log(`Disabling KPI ${kpiName}`);
  const disable = kpiItem(page, kpiName).getByRole('button', { name: 'Disable' });
  await changeKpi(page, kpiName, '', undefined, async () => {
    if (await disable.isVisible()) {
      await clickInKpiList(disable);
    }
  });
  await expect(kpiItem(page, kpiName).getByRole('button', { name: 'Enable' })).toBeVisible();
}

/** Clicks the name of an enabled KPI to open it in the KPI editor and waits for the editor to show it. */
export async function selectKpi(page: Page, kpiName: string): Promise<void> {
  await clickInKpiList(kpiItem(page, kpiName).getByText(kpiName, { exact: true }));
  await expect(page.locator('kpi-editor').getByRole('heading', { name: kpiName })).toBeVisible({ timeout: 15000 });
}

/** The KPI editor fields. */
export function kpiEditor(page: Page) {
  const editor = page.locator('kpi-editor');
  return {
    editor,
    benchmark: editor.getByRole('combobox', { name: 'Benchmark' }),
    value: editor.getByRole('spinbutton'),
    period: editor.getByRole('combobox', { name: 'Time Period' }),
    displayType: editor.getByRole('listbox'),
  };
}

/** Sets the Benchmark (More/Less) of the selected KPI and waits for the save. */
export async function setBenchmark(page: Page, kpiName: string, benchmark: 'More' | 'Less'): Promise<void> {
  await changeKpi(page, kpiName, '_BENCHMARK', benchmark.toLowerCase(), async () => {
    await kpiEditor(page).benchmark.click();
    await page.getByRole('option', { name: benchmark, exact: true }).click();
  });
}

/** Sets the Benchmark Value of the selected KPI (only editable once a Benchmark is chosen) and waits for the save. */
export async function setBenchmarkValue(page: Page, kpiName: string, value: string): Promise<void> {
  const field = kpiEditor(page).value;
  await expect(field).toBeEnabled();
  await changeKpi(page, kpiName, '_BENCHMARK_VALUE', value, async () => {
    await field.fill(value);
    await field.press('Tab'); // the value is saved when the field loses focus
  });
}

/** Sets the Time Period of the selected KPI and waits for the save. */
export async function setPeriod(page: Page, kpiName: string, period: NonNullable<KpiConfig['period']>): Promise<void> {
  await changeKpi(page, kpiName, '_PERIOD', undefined, async () => {
    await kpiEditor(page).period.click();
    await page.getByRole('option', { name: period, exact: true }).click();
  });
}

/** Sets the Display Type of the selected KPI and waits for the save. */
export async function setDisplayType(page: Page, kpiName: string, display: NonNullable<KpiConfig['display']>): Promise<void> {
  await changeKpi(page, kpiName, '_TYPE', undefined, async () => {
    // The list option is partly covered by the Time Period drop down's overlay, so the click is forced
    await kpiEditor(page).displayType.getByRole('option', { name: display, exact: true }).click({ force: true });
  });
}

/**
 * On the Group KPIs tab: enables the KPI (if it is not enabled yet), selects it and fills in the parts of the
 * configuration that are given. Leave a part out to leave it unconfigured (a KPI needs a Benchmark and a Time Period to
 * be shown).
 */
export async function configureKpi(page: Page, kpiName: string, config: KpiConfig): Promise<void> {
  if (await kpiItem(page, kpiName).getByRole('button', { name: 'Enable' }).isVisible()) {
    await enableKpi(page, kpiName);
  }
  await selectKpi(page, kpiName);
  if (config.benchmark) {
    await setBenchmark(page, kpiName, config.benchmark);
    if (config.value !== undefined) {
      await setBenchmarkValue(page, kpiName, config.value);
    }
  }
  if (config.period) {
    await setPeriod(page, kpiName, config.period);
  }
  if (config.display) {
    await setDisplayType(page, kpiName, config.display);
  }
  log(`KPI ${kpiName} configured: ${JSON.stringify(config)}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// KPI ribbon
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Goes to Tickets or Claims Queue and waits for the ribbon's results call to complete (it also covers a call that a test
 * has stubbed with page.route). Leaving the group page may show the 'no group flags' confirmation, which is dismissed.
 */
export async function openRibbonPage(page: Page, which: RibbonPage): Promise<void> {
  const { route, api } = RIBBON_PAGES[which];
  log(`Navigating to ${route} to look at the KPI ribbon`);
  const results = page.waitForResponse(r => api.test(r.url()), { timeout: 60000 });
  if (new URL(page.url()).hash === route) {
    await page.reload();
  } else {
    await page.goto(route);
    await dismissLeaveGroupConfirm(page);
  }
  await results;
  await page.waitForTimeout(1500); // let the ribbon render the results
}

/** Every KPI tile the ribbon shows. A tile whose Benchmark or Time Period is missing is hidden, so it is not counted. */
export function ribbonTiles(page: Page): Locator {
  return page.locator('kpi-ribbon ticker-kpi:not(.hidden), kpi-ribbon three-bar-graph-kpi:not(.hidden)');
}

/** Stubs the ribbon's results call for a category (a test supplies the service response it needs). */
export async function stubKpiResults(
  page: Page,
  which: RibbonPage,
  response: { results?: KpiResult[]; status?: number }
): Promise<void> {
  const status = response.status ?? 200;
  await page.route(RIBBON_PAGES[which].api, route =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: status === 200 ? JSON.stringify(response.results ?? []) : JSON.stringify({ Message: 'stubbed failure' }),
    })
  );
  log(`Stubbed the ${which} KPI results call: status ${status}, ${response.results?.length ?? 0} result(s)`);
}

/** Removes a stub made with stubKpiResults so the real service answers again. */
export async function unstubKpiResults(page: Page, which: RibbonPage): Promise<void> {
  await page.unroute(RIBBON_PAGES[which].api);
  log(`Removed the stub of the ${which} KPI results call`);
}

/** A KPI result as the API returns it. */
export function kpiResult(kpiName: string, groupName: string, values: Partial<KpiResult> & { UserResult: number; GroupResult: number }): KpiResult {
  return {
    Id: KPI_ID[kpiName],
    Type: 'ticker',
    UserId: process.env.ORION_USERNAME ?? '',
    GroupId: 0,
    GroupName: groupName,
    Benchmark: 'more',
    BenchmarkResult: 0,
    TimePeriod: 'month',
    LastUpdated: new Date().toISOString(),
    ...values,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// KPI Information dialog
// ---------------------------------------------------------------------------------------------------------------------

/** Clicks a ribbon tile and returns the KPI Information dialog. */
export async function openKpiInformation(page: Page, tile: Locator): Promise<Locator> {
  await tile.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

/** Reads the dialog's Name/Description/Short Name/Group Name/Individual/Group Average/Benchmark/Style/Period Measured table. */
export async function readKpiInformation(dialog: Locator): Promise<Record<string, string>> {
  const info: Record<string, string> = {};
  const rows = dialog.getByRole('row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const cells = rows.nth(i).getByRole('cell');
    const label = ((await cells.nth(0).innerText()) ?? '').replace(/:\s*$/, '').trim();
    info[label] = ((await cells.nth(1).innerText()) ?? '').trim();
  }
  return info;
}

/** Closes the KPI Information / KPI Settings dialog with the close button next to its title. */
export async function closeDialog(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button').first().click();
  await expect(dialog).toBeHidden();
}

// ---------------------------------------------------------------------------------------------------------------------
// KPI Settings (refresh interval)
// ---------------------------------------------------------------------------------------------------------------------

/** Administration > KPI Settings: opens the dialog with the KPI Refresh Interval options. */
export async function openKpiSettings(page: Page): Promise<Locator> {
  await page.getByRole('link', { name: /Administration/ }).click();
  await page.getByRole('link', { name: 'KPI Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'KPI Settings' });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

/**
 * Opens KPI Settings, picks the refresh interval, closes the dialog (the interval is saved when it closes, as
 * POST /api/configuration) and waits for the save.
 */
export async function setKpiRefreshInterval(page: Page, interval: '20 sec' | '60 sec' | '5 min'): Promise<void> {
  const dialog = await openKpiSettings(page);
  log(`Setting the KPI refresh interval to ${interval}`);
  const saved = page.waitForResponse(
    r =>
      /\/api\/configuration$/.test(r.url()) &&
      r.request().method() === 'POST' &&
      r.ok() &&
      (r.request().postData() ?? '').includes('KPI_REFRESH_INTERVAL'),
    { timeout: 20000 }
  );
  await dialog.getByRole('radio', { name: interval }).check({ force: true });
  await dialog.getByRole('button').first().click();
  await saved;
  await expect(dialog).toBeHidden();
}


// ---------------------------------------------------------------------------------------------------------------------
// Group KPIs list: acknowledgement, order, access (RT-25957)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Clicks Disable on a KPI, acknowledges the confirmation the user must give for it (a browser dialog or an in-page
 * dialog with a Yes/OK/Confirm/Proceed/Disable button) and waits for the save.
 * @returns true when a confirmation was shown and acknowledged, false when the KPI was disabled without one
 */
export async function disableKpiAcknowledging(page: Page, kpiName: string): Promise<boolean> {
  log(`Disabling KPI ${kpiName} and acknowledging the confirmation`);
  let acknowledged = false;
  const onBrowserDialog = (dialog: { accept: () => Promise<void> }) => {
    acknowledged = true;
    void dialog.accept();
  };
  page.on('dialog', onBrowserDialog);
  try {
    const saved = configurationSaved(page, kpiName, '', undefined, 30000);
    saved.catch(() => undefined);
    await clickInKpiList(kpiItem(page, kpiName).getByRole('button', { name: 'Disable' }));
    const confirm = page.getByRole('dialog').getByRole('button', { name: /^(yes|ok|confirm|proceed|disable)$/i });
    if (await confirm.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)) {
      acknowledged = true;
      await confirm.first().click();
    }
    await saved;
  } finally {
    page.off('dialog', onBrowserDialog);
  }
  await expect(kpiItem(page, kpiName).getByRole('button', { name: 'Enable' })).toBeVisible();
  return acknowledged;
}

/**
 * The KPI names the Group KPIs tab lists under each category heading, in the order shown (read from the page, not
 * sorted). Only the names in allNames are picked up from a row, so the Enable/Disable button text is not part of a name.
 */
export async function readKpiListOrder(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(
    ({ categories, allNames }) => {
      const result: Record<string, string[]> = {};
      let current: string | undefined;
      for (const el of document.querySelectorAll('h1, h2, h3, h4, h5, h6, .kpi-item')) {
        if (!el.classList.contains('kpi-item')) {
          const text = (el.textContent ?? '').trim().toLowerCase();
          current = categories.find(c => c.toLowerCase() === text);
          if (current) {
            result[current] = [];
          }
          continue;
        }
        const leaf = [...el.querySelectorAll('*')].find(
          n => n.children.length === 0 && allNames.includes((n.textContent ?? '').trim())
        );
        if (current && leaf) {
          result[current].push((leaf.textContent ?? '').trim());
        }
      }
      return result;
    },
    { categories: ['Claims Processing KPIs', 'Customer Service KPIs'], allNames: [...CLAIMS_PROCESSING_KPIS, ...CUSTOMER_SERVICE_KPIS] }
  );
}

/** True when a control is not offered to the user: it is not in the page at all, or it is shown but disabled. */
export async function isUnavailable(control: Locator): Promise<boolean> {
  if ((await control.count()) === 0) {
    return true;
  }
  return control.first().isDisabled();
}
