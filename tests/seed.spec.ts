import { test, expect } from '@playwright/test';
import { getCredentials } from '../utils/credentials';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    // Log in with credentials from .env (ORION_USERNAME / ORION_PASSWORD); never hardcode or log them.
    const { username, password } = getCredentials();

    await page.goto('http://tillamook22.applegate.local:8100/#/login');
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).not.toHaveURL(/#\/login/);
  });
});
