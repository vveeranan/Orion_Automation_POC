import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { log } from './logger';
import { openMyTickets } from './tickets';

export interface ProviderCallData {
  /** Value typed into the 'caller' box */
  caller: string;
  /** Value typed into the 'caller phone' box */
  callerPhone: string;
  /** Text typed into the 'provider search' box (the provider created by the test setup) */
  providerName: string;
  /** Provider name expected on the ticket after the provider is selected */
  expectedProviderNameInTab: string;
}

/**
 * Provider Call template: creates a Provider Call ticket for a provider and leaves the new ticket open.
 * The user must already be logged in. Shared by every spec that needs a provider ticket.
 *
 * Unlike a Member Call, the ticket is NOT created when 'Provider Call' is clicked: it is created when the provider
 * is selected.
 *
 * @returns the id of the new ticket and the My Tickets count from before it was created (a baseline)
 */
export async function createProviderCall(page: Page, data: ProviderCallData): Promise<{ ticketId: string; baseline: number }> {
  // 1. Open Customer Service > My Tickets and note the ticket count
  const baseline = await openMyTickets(page);

  // 2. Add Ticket > Provider Call. The page stays on #/newticket and shows a 'provider search' box with the message
  // 'Provider is required.'
  log('Clicking Add Ticket button');
  await page.getByRole('link', { name: 'Add Ticket' }).click();
  await expect(page).toHaveURL(/#\/newticket/);
  log('Add Ticket form loaded successfully');
  log('Clicking Provider Call button');
  await page.getByRole('button', { name: 'Provider Call' }).click();

  const providerSearch = page.getByRole('textbox', { name: 'search' });
  await expect(providerSearch).toBeVisible();
  // (the message is rendered twice - in a validation summary list and inline - so take the first match)
  await expect(page.getByText('Provider is required.').first()).toBeVisible();

  // 3. Enter the caller and caller phone
  log(`Entering caller: ${data.caller}`);
  const callerBox = page.getByRole('textbox').first();
  await callerBox.fill(data.caller);
  log(`Entering caller phone: ${data.callerPhone}`);
  await page.getByRole('textbox').nth(1).fill(data.callerPhone);
  await expect(callerBox).toHaveValue(data.caller);
  log('Caller details entered successfully');

  // 4. Search for the provider (submit with Enter) and select the match.
  // Selecting the provider satisfies the requirement: the ticket is created and the URL changes to #/tickets/{id}
  log(`Entering provider name: ${data.providerName}`);
  await providerSearch.fill(data.providerName);
  await providerSearch.press('Enter');
  log('Selecting provider from search results');
  await page.getByRole('row', { name: new RegExp(data.providerName) }).click();

  await expect(page).toHaveURL(/#\/tickets\/\d+$/, { timeout: 15000 });
  const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];
  log(`Provider Call ticket created: ${ticketId}`);
  await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(data.expectedProviderNameInTab) })).toBeVisible();
  log(`Provider name '${data.expectedProviderNameInTab}' verified successfully in ticket details`);

  return { ticketId, baseline };
}
