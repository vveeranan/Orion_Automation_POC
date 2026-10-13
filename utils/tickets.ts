import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readCount } from './grid';
import { log } from './logger';

/**
 * Opens Customer Service > My Tickets and returns the ticket count shown there, to be used as a baseline.
 * The user must already be logged in.
 */
export async function openMyTickets(page: Page): Promise<number> {
  log('Navigating to Customer Service > My Tickets');
  await page.goto('#/mytickets');
  await expect(page.getByRole('heading', { name: 'Tickets My Unresolved Tickets' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('link', { name: 'Add Ticket' })).toBeVisible();
  log('Successfully navigated to My Tickets page');

  // Record the ticket count as the baseline (wait for grid data so the count is loaded)
  await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
  const baseline = await readCount(page, /Tickets/);
  log(`Ticket count before the new ticket: ${baseline}`);
  return baseline;
}

/**
 * Goes back to My Tickets and verifies the new ticket is listed first (type, status, caller and creator) and that
 * the ticket count is up by one from the baseline.
 */
export async function expectNewTicketListed(
  page: Page,
  expected: { baseline: number; ticketId: string; type: 'Member' | 'Provider'; caller: string; username: string }
): Promise<void> {
  log(`Returning to My Tickets to verify new ticket ${expected.ticketId} is listed`);
  await page.goto('#/mytickets');
  await expect(page.getByText(new RegExp(`(^|\\s)${expected.baseline + 1}\\s+Tickets`)).first()).toBeVisible();
  log(`Ticket count is up by one: ${expected.baseline + 1}`);

  const topRow = page.getByRole('row').nth(1);
  await expect(topRow.getByRole('cell', { name: expected.ticketId, exact: true })).toBeVisible();
  await expect(topRow.getByRole('cell', { name: expected.type, exact: true })).toBeVisible();
  await expect(topRow.getByRole('cell', { name: 'Open', exact: true })).toBeVisible();
  await expect(topRow.getByRole('cell', { name: expected.caller, exact: true })).toBeVisible();
  await expect(topRow.getByRole('cell', { name: expected.username })).toBeVisible();
  log(`Ticket ${expected.ticketId} is listed first: type ${expected.type}, status Open, caller ${expected.caller}, created by ${expected.username}`);
}
