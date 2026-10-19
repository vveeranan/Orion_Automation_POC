// RT:25957 - Administration > Groups > Group KPIs (configure, enable/disable, details, access), Release ORION 2025.2000.1
// seed: tests/seed.spec.ts
//
// Test case wording follows the FRD; in the build under test the names differ a little:
//   - Claim KPIs / CS KPIs         = the 'Claims Processing KPIs' / 'Customer Service KPIs' headings
//   - Period measured              = 'Time Period' (Current Day, Current Week, Current Month, Last 24 Hours)
//   - Style (Bar / Ticker)         = 'Display Type' (Three Bar Graph / Ticker)
//   - Save                         = there is no Save button: every change in the KPI editor is saved as it is made
//   - KPI details and Edit panel   = the same panel (the KPI editor)
//   - Disabled KPI that is enabled = an enabled KPI without Benchmark / Time Period is flagged 'not configured!'
//
// Each test has its own group (created by its setup in Setups/TC<id>.cs). Tests that look at the ribbon assign the logged
// in user to the group; afterEach takes the user out of the group again so one test's KPIs never show in another's ribbon.

import { test, expect } from '../fixtures/testData.fixture';
import { login } from '../utils/auth';
import { getNoKpiAccessCredentials } from '../utils/credentials';
import { log } from '../utils/logger';
import {
  CLAIMS_PROCESSING_KPIS,
  CUSTOMER_SERVICE_KPIS,
  KpiConfig,
  assignUserToGroup,
  cleanupKpiGroups,
  closeDialog,
  configureKpi,
  disableKpiAcknowledging,
  dismissLeaveGroupConfirm,
  enableKpi,
  isUnavailable,
  kpiEditor,
  kpiItem,
  openGroup,
  openGroupKpis,
  openKpiInformation,
  openRibbonPage,
  readKpiInformation,
  readKpiListOrder,
  ribbonTiles,
  selectKpi,
  setBenchmark,
  setBenchmarkValue,
  setDisplayType,
  setPeriod,
} from '../utils/kpi';
import type { Page } from '@playwright/test';
import type { TestData } from '../types/testData';

// Every test logs in, opens a slow admin page and saves several settings: allow more than 30s
test.describe.configure({ timeout: 240000 });

// Take the logged in user out of the group(s) a test put them in, even when the test failed
test.afterEach(async ({ page }) => {
  await cleanupKpiGroups(page);
});

/** A KPI the tests leave disabled (TC17083, TC17095). */
const DISABLED_KPI = 'Claims Worked';

/** Log in, open the test's group (created by the setup) and its Group KPIs tab. Returns the group id. */
async function openKpis(page: Page, testData: TestData): Promise<number> {
  await login(page);
  const groupId = await openGroup(page, testData.GroupName);
  await openGroupKpis(page);
  return groupId;
}

/** Like openKpis, but also assigns the logged in user to the group first (needed to see the KPI in the ribbon). */
async function openKpisAssigned(page: Page, testData: TestData): Promise<number> {
  const username = await login(page);
  const groupId = await openGroup(page, testData.GroupName);
  await assignUserToGroup(page, groupId, username);
  await openGroupKpis(page);
  return groupId;
}

/** Reloads the open group and goes back to its Group KPIs tab, to read the saved configuration back. */
async function reloadGroupKpis(page: Page): Promise<void> {
  log('Reloading the group to read the saved configuration back');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Group KPIs' })).toBeVisible({ timeout: 30000 });
  await openGroupKpis(page);
}

/** Leaves the ribbon page and goes back to the group's Group KPIs tab. */
async function backToGroupKpis(page: Page): Promise<void> {
  await page.goBack();
  await dismissLeaveGroupConfirm(page);
  await openGroupKpis(page);
}

/** Verifies the KPI editor shows the given saved configuration (Benchmark, value and Time Period). */
async function expectEditorConfig(page: Page, config: Pick<KpiConfig, 'benchmark' | 'value' | 'period'>): Promise<void> {
  const { benchmark, value, period } = kpiEditor(page);
  if (config.benchmark) await expect(benchmark).toContainText(config.benchmark);
  if (config.value !== undefined) await expect(value).toHaveValue(config.value);
  if (config.period) await expect(period).toContainText(config.period);
}

/**
 * A user without KPI access works in a second browser session next to the main automation user. Skips the test when that
 * user is not provisioned in .env (see utils/credentials.ts), otherwise returns their page. The caller closes the context.
 */
async function openAsNoKpiUser(browser: import('@playwright/test').Browser, baseURL: string | undefined, groupId: number) {
  const credentials = getNoKpiAccessCredentials();
  test.skip(!credentials, 'ORION_NOKPI_USERNAME / ORION_NOKPI_PASSWORD are not set in .env');
  const context = await browser.newContext({ baseURL });
  const noKpiPage = await context.newPage();
  await login(noKpiPage, credentials);
  log(`Opening group ${groupId} as the user without KPI access`);
  await noKpiPage.goto(`#/groups/${groupId}`);
  await expect(noKpiPage.getByRole('link', { name: 'Group KPIs' })).toBeVisible({ timeout: 30000 });
  await openGroupKpis(noKpiPage);
  return { context, noKpiPage };
}

test.describe('RT-25957 Group KPIs', () => {
  test('TC17081 GroupKPIs_WhenOpened_ShouldList6ClaimKPIsAnd4CSKPIs', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@CustomerService'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group created by the setup and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Both KPI category headings are shown
    await expect(page.getByRole('heading', { name: 'Claims Processing KPIs' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Service KPIs' })).toBeVisible();

    // 5. The 6 Claims KPIs are listed
    expect(CLAIMS_PROCESSING_KPIS).toHaveLength(6);
    for (const name of CLAIMS_PROCESSING_KPIS) {
      await expect(kpiItem(page, name), `${name} is listed`).toBeVisible();
    }

    // 6. The 4 CS KPIs are listed
    expect(CUSTOMER_SERVICE_KPIS).toHaveLength(4);
    for (const name of CUSTOMER_SERVICE_KPIS) {
      await expect(kpiItem(page, name), `${name} is listed`).toBeVisible();
    }

    // 7. Exactly 10 KPIs in all
    await expect(page.locator('.kpi-item')).toHaveCount(10);
    log('6 Claims KPIs and 4 CS KPIs are listed');
  });

  test('TC17082 GroupKPIs_WhenEnabledWithBenchmarkPeriodAndStyle_ShouldShowEnabled', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable the KPI and set Benchmark, Benchmark value, Period measured and Style (each change is saved as it is made)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month', display: 'Ticker' });

    // 5. The KPI shows as enabled (offers Disable) and is fully configured
    await expect(kpiItem(page, testData.KpiName).getByRole('button', { name: 'Disable' })).toBeVisible();
    await expect(kpiItem(page, testData.KpiName).getByText('not configured!')).toHaveCount(0);

    // 6. After a reload the saved state is read back: still enabled
    await reloadGroupKpis(page);
    await expect(kpiItem(page, testData.KpiName).getByRole('button', { name: 'Disable' })).toBeVisible();

    // 7. The saved configuration is shown in the editor
    await selectKpi(page, testData.KpiName);
    await expectEditorConfig(page, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month' });
  });

  test('TC17083 GroupKPIs_WhenListed_ShouldDistinguishEnabledFromDisabledKPIs', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable one KPI; leave another disabled
    await enableKpi(page, testData.KpiName);
    const enabled = kpiItem(page, testData.KpiName);
    const disabled = kpiItem(page, DISABLED_KPI);

    // 5. The enabled KPI offers Disable, the disabled one offers Enable
    await expect(enabled.getByRole('button', { name: 'Disable' })).toBeVisible();
    await expect(enabled.getByRole('button', { name: 'Enable' })).toHaveCount(0);
    await expect(disabled.getByRole('button', { name: 'Enable' })).toBeVisible();
    await expect(disabled.getByRole('button', { name: 'Disable' })).toHaveCount(0);

    // 6. The two rows look different (class and computed style). Soft: the FRD only requires they can be told apart.
    const look = (row: typeof enabled) =>
      row.first().evaluate(el => {
        const s = getComputedStyle(el);
        return { cls: [...el.classList].sort().join(' '), bg: s.backgroundColor, color: s.color, opacity: s.opacity, border: s.border };
      });
    const enabledLook = await look(enabled);
    const disabledLook = await look(disabled);
    log(`Enabled row: ${JSON.stringify(enabledLook)}; disabled row: ${JSON.stringify(disabledLook)}`);
    expect.soft(enabledLook, 'enabled and disabled rows are visually distinct').not.toEqual(disabledLook);
  });

  test('TC17084 GroupKPIs_WhenNeverConfiguredKPIEnabled_ShouldOpenEditorWithNoDefaults', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group (new, so nothing was ever configured) and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable the KPI and open it in the editor
    await enableKpi(page, testData.KpiName);
    await selectKpi(page, testData.KpiName);

    // 5. The editor shows the KPI but no default values: no Benchmark, empty value, no Period measured
    const { editor, benchmark, value, period } = kpiEditor(page);
    await expect(editor.getByRole('heading', { name: testData.KpiName })).toBeVisible();
    await expect(benchmark).not.toContainText(/More|Less/);
    await expect(value).toHaveValue('');
    await expect(period).not.toContainText(/Current|Last/);

    // 6. The KPI is flagged as not configured
    await expect(kpiItem(page, testData.KpiName).getByText('not configured!')).toBeVisible();
  });

  test('TC17085 GroupKPIs_WhenBenchmarkValueEmpty_ShouldNotConfigureKPI', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Negative'] }, async ({ page, testData }) => {
    // 1-4. Log in, open the group, assign the user (to look at the ribbon) and open Group KPIs
    await openKpisAssigned(page, testData);

    // 5. Configure everything except the Benchmark value (there is no Save button: the build saves each change)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', period: 'Current Month', display: 'Ticker' });

    // 6. The empty value is kept and the KPI is flagged as not configured
    await expect(kpiEditor(page).value).toHaveValue('');
    await expect.soft(kpiItem(page, testData.KpiName).getByText('not configured!')).toBeVisible();

    // 7. The ribbon does not offer the KPI
    await openRibbonPage(page, 'claims');
    await expect(ribbonTiles(page)).toHaveCount(0);

    // 8. Back on the group the value is still empty: nothing was saved for it
    await backToGroupKpis(page);
    await selectKpi(page, testData.KpiName);
    await expect(kpiEditor(page).value).toHaveValue('');
  });

  test('TC17086 GroupKPIs_WhenDecimalBenchmarkValueEntered_ShouldRefuseValue', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Negative'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable the KPI, select it and choose a Benchmark (the value field is editable after that)
    await enableKpi(page, testData.KpiName);
    await selectKpi(page, testData.KpiName);
    await setBenchmark(page, testData.KpiName, 'More');

    // 5. Record the configuration saves, type a decimal value and leave the field
    const saves: string[] = [];
    page.on('request', r => {
      if (/\/api\/groups\/\d+\/configuration/.test(r.url()) && r.method() === 'POST') saves.push(r.postData() ?? '');
    });
    const { value } = kpiEditor(page);
    await value.fill(testData.DecimalValue);
    await value.press('Tab');
    await page.waitForTimeout(2000); // give a (wrong) save time to be sent

    // 6. The decimal was not saved and the field does not keep it
    expect(saves.filter(body => body.includes(`"Value":"${testData.DecimalValue}"`)), 'decimal value was not sent').toHaveLength(0);
    await expect(value).not.toHaveValue(testData.DecimalValue);

    // 7. A whole number is accepted, saved and shown
    await setBenchmarkValue(page, testData.KpiName, testData.BenchmarkValue);
    await expect(value).toHaveValue(testData.BenchmarkValue);
  });

  test('TC17087 GroupKPIs_WhenEditingKPI_ShouldOfferMoreThanAndLessThanBenchmark', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable the KPI and select it
    await enableKpi(page, testData.KpiName);
    await selectKpi(page, testData.KpiName);

    // 5. The Benchmark list offers exactly More (than) and Less (than)
    await kpiEditor(page).benchmark.click();
    await expect(page.getByRole('option')).toHaveText(['More', 'Less']);
    await page.keyboard.press('Escape');

    // 6. Each choice is saved and shown
    await setBenchmark(page, testData.KpiName, 'More');
    await expect(kpiEditor(page).benchmark).toContainText('More');
    await setBenchmark(page, testData.KpiName, 'Less');
    await expect(kpiEditor(page).benchmark).toContainText('Less');
  });

  test('TC17088 GroupKPIs_WhenEditingKPI_ShouldOfferTheFourPeriodsMeasured', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable the KPI and select it
    await enableKpi(page, testData.KpiName);
    await selectKpi(page, testData.KpiName);

    // 5. The Period measured (Time Period) list offers exactly the four periods
    const periods = ['Current Day', 'Current Week', 'Current Month', 'Last 24 Hours'] as const;
    await kpiEditor(page).period.click();
    await expect(page.getByRole('option')).toHaveText([...periods]);
    await page.keyboard.press('Escape');

    // 6. Each period is saved and shown
    for (const period of periods) {
      await setPeriod(page, testData.KpiName, period);
      await expect(kpiEditor(page).period, `${period} is shown after choosing it`).toContainText(period);
    }
  });

  test('TC17089 GroupKPIs_WhenEditingKPI_ShouldOfferBarAndTickerStylesAndSaveEach', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration', '@Ribbon'] }, async ({ page, testData }) => {
    // 1-4. Log in, open the group, assign the user (to see the ribbon) and open Group KPIs
    await openKpisAssigned(page, testData);

    // 5. Configure everything but the Style
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Day' });

    // 6. The Style (Display Type) list offers Bar (Three Bar Graph) and Ticker
    const { displayType } = kpiEditor(page);
    await expect(displayType.getByRole('option', { name: 'Three Bar Graph' })).toBeVisible();
    await expect(displayType.getByRole('option', { name: 'Ticker' })).toBeVisible();

    // 7. Bar is saved: the ribbon shows one bar graph tile and the information dialog says Bar Chart
    await setDisplayType(page, testData.KpiName, 'Three Bar Graph');
    await openRibbonPage(page, 'claims');
    await expect(page.locator('kpi-ribbon three-bar-graph-kpi:not(.hidden)')).toHaveCount(1);
    let info = await readKpiInformation(await openKpiInformation(page, ribbonTiles(page)));
    expect(info['Style']).toBe('Bar Chart');
    await closeDialog(page);

    // 8. Ticker is saved: the ribbon shows one ticker tile and the information dialog says Ticker
    await backToGroupKpis(page);
    await selectKpi(page, testData.KpiName);
    await setDisplayType(page, testData.KpiName, 'Ticker');
    await openRibbonPage(page, 'claims');
    await expect(page.locator('kpi-ribbon ticker-kpi:not(.hidden)')).toHaveCount(1);
    info = await readKpiInformation(await openKpiInformation(page, ribbonTiles(page)));
    expect(info['Style']).toBe('Ticker');
    await closeDialog(page);
  });

  test('TC17090 GroupKPIs_WhenEnabledKPISelected_ShouldShowConfigurationAndCurrentValues', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Details'] }, async ({ page, testData }) => {
    // 1-4. Log in, open the group, assign the user and open Group KPIs
    await openKpisAssigned(page, testData);

    // 5. Enable and configure the KPI (More, 6, Current Week, Ticker)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Week', display: 'Ticker' });

    // 6. Reload and select the KPI
    await reloadGroupKpis(page);
    await selectKpi(page, testData.KpiName);

    // 7. The details show its name, description and configuration
    const { editor } = kpiEditor(page);
    await expect(editor.getByRole('heading', { name: testData.KpiName })).toBeVisible();
    await expect(editor.locator('p').first(), 'the KPI has a description').not.toBeEmpty();
    await expectEditorConfig(page, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Week' });

    // 8. The current values are those of the ribbon's KPI Information dialog
    await openRibbonPage(page, 'claims');
    const info = await readKpiInformation(await openKpiInformation(page, ribbonTiles(page)));
    expect(info['Name']).toBe(testData.KpiName);
    expect(info['Individual']).toMatch(/^\d+$/);
    expect(info['Group Average']).toMatch(/^\d+$/);
    expect(info['Benchmark']).toContain(testData.BenchmarkValue);
    expect(info['Period Measured']).toMatch(/week/i);
    await closeDialog(page);
  });

  test('TC17091 GroupKPIs_WhenBenchmarkValueEditedFromDetails_ShouldShowNewValueInDetailsAndRibbon', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Details', '@Ribbon'] }, async ({ page, testData }) => {
    // 1-4. Log in, open the group, assign the user and open Group KPIs
    await openKpisAssigned(page, testData);

    // 5. Enable and configure the KPI (More, 4, Current Month, Ticker)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month', display: 'Ticker' });

    // 6. Select the KPI (its details are the edit panel) and change the Benchmark value; it is saved as it is made
    await selectKpi(page, testData.KpiName);
    await setBenchmarkValue(page, testData.KpiName, testData.NewBenchmarkValue);

    // 7. The details show the new value, also after reloading
    await expect(kpiEditor(page).value).toHaveValue(testData.NewBenchmarkValue);
    await reloadGroupKpis(page);
    await selectKpi(page, testData.KpiName);
    await expect(kpiEditor(page).value).toHaveValue(testData.NewBenchmarkValue);

    // 8. The ribbon's KPI Information dialog shows the new benchmark
    await openRibbonPage(page, 'claims');
    const info = await readKpiInformation(await openKpiInformation(page, ribbonTiles(page)));
    expect(info['Benchmark']).toMatch(new RegExp(`${testData.NewBenchmarkValue}$`));
    await closeDialog(page);
  });

  test('TC17093 GroupKPIs_WhenEnabledKPIDisabledAndAcknowledged_ShouldRemoveItFromRibbon', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Ribbon'] }, async ({ page, testData }) => {
    // 1-4. Log in, open the group, assign the user and open Group KPIs
    await openKpisAssigned(page, testData);

    // 5. Enable and configure the KPI (More, 4, Current Month, Ticker)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month', display: 'Ticker' });

    // 6. The ribbon shows the KPI
    await openRibbonPage(page, 'claims');
    await expect(ribbonTiles(page)).toHaveCount(1);

    // 7. Back on the group, Disable the KPI and acknowledge the confirmation
    await backToGroupKpis(page);
    const acknowledged = await disableKpiAcknowledging(page, testData.KpiName);
    expect(acknowledged, 'a confirmation was shown and acknowledged').toBe(true);

    // 8. The KPI offers Enable again
    await expect(kpiItem(page, testData.KpiName).getByRole('button', { name: 'Enable' })).toBeVisible();

    // 9. The ribbon no longer shows the KPI
    await openRibbonPage(page, 'claims');
    await expect(ribbonTiles(page)).toHaveCount(0);
  });

  test('TC17094 GroupKPIs_WhenDisabledKPIEnabledAgain_ShouldShowSavedConfigurationInEditor', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Configuration'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable and configure the KPI (More, 7, Current Week, Ticker)
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Week', display: 'Ticker' });

    // 5. Disable it and acknowledge the confirmation
    await disableKpiAcknowledging(page, testData.KpiName);

    // 6. Enable it again: it is enabled and not flagged as not configured
    await enableKpi(page, testData.KpiName);
    await expect(kpiItem(page, testData.KpiName).getByText('not configured!')).toHaveCount(0);

    // 7. The editor shows the saved configuration, not empty fields
    await selectKpi(page, testData.KpiName);
    await expectEditorConfig(page, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Week' });
  });

  test('TC17095 GroupKPIs_WhenUserHasNoKPIAccess_ShouldMakeEnableDisableAndEditUnavailable', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Permissions', '@Negative'] }, async ({ page, browser, baseURL, testData }) => {
    // 1-2. As the main user: open the group, enable one KPI completely and leave another disabled
    const groupId = await openKpis(page, testData);
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month', display: 'Ticker' });

    // 3. In a second session log in as the user without KPI access and open the same group's Group KPIs
    const { context, noKpiPage } = await openAsNoKpiUser(browser, baseURL, groupId);
    try {
      // 4. The KPIs are listed
      await expect(kpiItem(noKpiPage, testData.KpiName)).toBeVisible();
      await expect(kpiItem(noKpiPage, DISABLED_KPI)).toBeVisible();

      // 5. Disable is unavailable on the enabled KPI
      expect(await isUnavailable(kpiItem(noKpiPage, testData.KpiName).getByRole('button', { name: 'Disable' })), 'Disable unavailable').toBe(true);

      // 6. Enable is unavailable on the disabled KPI
      expect(await isUnavailable(kpiItem(noKpiPage, DISABLED_KPI).getByRole('button', { name: 'Enable' })), 'Enable unavailable').toBe(true);

      // 7. Select the enabled KPI: no Edit and the configuration fields cannot be changed
      await selectKpi(noKpiPage, testData.KpiName);
      const { editor, benchmark, value, period } = kpiEditor(noKpiPage);
      await expect(editor.getByRole('button', { name: /edit/i })).toHaveCount(0);
      expect(await isUnavailable(benchmark), 'Benchmark locked').toBe(true);
      expect(await isUnavailable(value), 'Benchmark value locked').toBe(true);
      expect(await isUnavailable(period), 'Period measured locked').toBe(true);
    } finally {
      await context.close();
    }
  });

  test('TC17096 GroupKPIs_WhenUserWithoutKPIAccessSelectsEnabledKPI_ShouldShowConfigurationDetails', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Permissions', '@Details'] }, async ({ page, browser, baseURL, testData }) => {
    // 1-2. As the main user: open the group and enable the KPI completely
    const groupId = await openKpis(page, testData);
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month', display: 'Ticker' });

    // 3. In a second session log in as the user without KPI access and open the group's Group KPIs
    const { context, noKpiPage } = await openAsNoKpiUser(browser, baseURL, groupId);
    try {
      // 4. Select the enabled KPI
      await selectKpi(noKpiPage, testData.KpiName);

      // 5. The configuration details are shown (read only)
      const { editor } = kpiEditor(noKpiPage);
      await expect(editor.getByRole('heading', { name: testData.KpiName })).toBeVisible();
      await expect(editor.locator('p').first(), 'the KPI has a description').not.toBeEmpty();
      await expectEditorConfig(noKpiPage, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Month' });
    } finally {
      await context.close();
    }
  });

  test('TC17097 GroupKPIs_WhenListed_ShouldGroupByCategoryInAlphabeticalOrder', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@CustomerService'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Read the KPI names under each heading, in the order shown
    const order = await readKpiListOrder(page);
    log(`KPI order on the page: ${JSON.stringify(order)}`);

    // 5. Each KPI is under its own category
    expect([...order['Claims Processing KPIs']].sort()).toEqual([...CLAIMS_PROCESSING_KPIS].sort());
    expect([...order['Customer Service KPIs']].sort()).toEqual([...CUSTOMER_SERVICE_KPIS].sort());

    // 6. Within each category the order is alphabetical
    for (const [category, names] of Object.entries(order)) {
      expect(names, `${category} is in alphabetical order`).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  test('TC17099 GroupKPIs_WhenAnotherEnabledKPISelected_ShouldShowItsOwnConfiguration', { tag: ['@Regression', '@KPI', '@GroupKPIs', '@Administration', '@Claims', '@Details'] }, async ({ page, testData }) => {
    // 1-3. Log in, open the group and its Group KPIs tab
    await openKpis(page, testData);

    // 4. Enable two KPIs with different configurations
    await configureKpi(page, testData.KpiName, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Day', display: 'Ticker' });
    await configureKpi(page, testData.SecondKpiName, { benchmark: 'Less', value: testData.SecondBenchmarkValue, period: 'Current Month', display: 'Three Bar Graph' });

    // 5. Select the first KPI: its details are shown
    await selectKpi(page, testData.KpiName);
    await expectEditorConfig(page, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Day' });

    // 6. Select the second KPI: the details change to its own, nothing of the first is left over
    await selectKpi(page, testData.SecondKpiName);
    await expect(kpiEditor(page).editor.getByRole('heading', { name: testData.KpiName })).toHaveCount(0);
    await expectEditorConfig(page, { benchmark: 'Less', value: testData.SecondBenchmarkValue, period: 'Current Month' });

    // 7. Select the first again: its own configuration is shown again
    await selectKpi(page, testData.KpiName);
    await expectEditorConfig(page, { benchmark: 'More', value: testData.BenchmarkValue, period: 'Current Day' });
  });
});
