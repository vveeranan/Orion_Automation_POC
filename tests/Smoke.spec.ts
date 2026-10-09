// spec: specs/Smoke.md
// seed: tests/seed.spec.ts

import { test, expect } from '../fixtures/testData.fixture';
import { getCredentials } from '../utils/credentials';

test.describe('Member Call ticket creation', () => {
  test('TC001 Create member call ticket', async ({ page, testData }) => {
    const { username, password } = getCredentials();

    // 1. Login with ORION_USERNAME / ORION_PASSWORD (via getCredentials()), then navigate to Customer Service > My Tickets
    await page.goto('#/login');
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    // Set the password via evaluate (not fill) so the value is not written into step titles in the Allure report
    await page.getByRole('textbox', { name: 'Password' }).evaluate((el, value) => {
      (el as HTMLInputElement).value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).not.toHaveURL(/#\/login/);

    await page.goto('#/mytickets');
    await expect(page).toHaveURL(/#\/mytickets/);
    await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();

    // Record the ticket count label as the baseline
    // (label text is not an isolated node, so match unanchored; wait for grid data so the count is loaded)
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 15000 });
    const countLabel = page.getByText(/\d+ Tickets/).first();
    await expect(countLabel).toBeVisible({ timeout: 15000 });
    const baseline = Number(((await countLabel.textContent()) ?? '').match(/(\d+)\s+Tickets/)![1]);

    // 2. Click link 'Add Ticket', then click button 'Member Call'
    await page.getByRole('link', { name: 'Add Ticket' }).click();
    await expect(page).toHaveURL(/#\/newticket/);
    await page.getByRole('button', { name: 'Member Call' }).click();

    await expect(page).toHaveURL(/#\/tickets\/\d+$/);
    const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];

    await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delegated' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Resolved' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'New' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Same as Caller' })).toBeVisible();
    const memberSearch = page.getByRole('textbox', { name: 'search' });
    await expect(memberSearch).toBeVisible();

    // 3. Type testData.Caller in 'caller' and testData.CallerPhone in 'caller phone'
    const callerBox = page.getByRole('textbox').first();
    const callerPhoneBox = page.getByRole('textbox').nth(1);
    await callerBox.fill(testData.Caller);
    await callerPhoneBox.fill(testData.CallerPhone);
    await expect(callerBox).toHaveValue(testData.Caller);

    // 4. Type testData.SearchMemberName in 'member search', run the search and select the matching member
    // (the search is submitted with Enter; the search-box button is a clear (x) button)
    await memberSearch.fill(testData.SearchMemberName);
    await memberSearch.press('Enter');
    await page.getByRole('row', { name: new RegExp(testData.SearchMemberName) }).click();
    await expect(
      page.getByRole('link', { name: new RegExp(testData.ExpectedMemberNameInTab) })
    ).toBeVisible();

    // 5. Navigate to #/mytickets
    await page.goto('#/mytickets');
    await expect(page.getByText(new RegExp(`(^|\\s)${baseline + 1}\\s+Tickets`)).first()).toBeVisible();

    const topRow = page.getByRole('row').nth(1);
    await expect(topRow.getByRole('cell', { name: ticketId, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: 'Open', exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: testData.Caller, exact: true })).toBeVisible();
    await expect(topRow.getByRole('cell', { name: username })).toBeVisible();
  });
});
