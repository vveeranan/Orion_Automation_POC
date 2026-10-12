import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { getCredentials } from './credentials';

/**
 * Logs in to Orion with ORION_USERNAME / ORION_PASSWORD (via getCredentials()) and returns the username
 * so the test can assert on 'Created By' style columns or assign things to the logged in user.
 * Never log the password.
 */
export async function login(page: Page): Promise<string> {
  const { username, password } = getCredentials();

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
  // After login the app loads its configuration on #/configuration before it accepts navigation; going to another
  // page while it is still loading can leave the next page blank, so wait for the app to move on.
  await page.waitForFunction(() => !location.hash.startsWith('#/configuration'), null, { timeout: 60000 });

  return username;
}
