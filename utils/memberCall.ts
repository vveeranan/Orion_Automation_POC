import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { log } from './logger';
import { openMyTickets } from './tickets';

export interface MemberCallData {
  /** Value typed into the 'caller' box */
  caller: string;
  /** Value typed into the 'caller phone' box */
  callerPhone: string;
  /** Text typed into the 'member search' box (the member created by the test setup) */
  memberName: string;
  /** Member name expected on the ticket after the member is selected */
  expectedMemberNameInTab: string;
}

/**
 * Member Call template: creates a Member Call ticket for a member and leaves the new ticket open.
 * The user must already be logged in. Shared by every spec that needs a member ticket.
 *
 * @returns the id of the new ticket and the My Tickets count from before it was created (a baseline)
 */
export async function createMemberCall(page: Page, data: MemberCallData): Promise<{ ticketId: string; baseline: number }> {
  // 1. Open Customer Service > My Tickets and note the ticket count
  const baseline = await openMyTickets(page);

  // 2. Add Ticket > Member Call. The ticket is created immediately and the URL changes to #/tickets/{id}
  log('Clicking Add Ticket button');
  await page.getByRole('link', { name: 'Add Ticket' }).click();
  await expect(page).toHaveURL(/#\/newticket/);
  log('Add Ticket form loaded successfully');
  log('Clicking Member Call button');
  await page.getByRole('button', { name: 'Member Call' }).click();

  await expect(page).toHaveURL(/#\/tickets\/\d+$/);
  const ticketId = page.url().match(/#\/tickets\/(\d+)$/)![1];
  log(`Member Call ticket created: ${ticketId}`);

  // The new ticket starts in the 'Open' status with the member search available
  await expect(page.getByText(`Ticket (${ticketId})`).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Same as Caller' })).toBeVisible();
  const memberSearch = page.getByRole('textbox', { name: 'search' });
  await expect(memberSearch).toBeVisible();

  // 3. Enter the caller and caller phone
  log(`Entering caller: ${data.caller}`);
  const callerBox = page.getByRole('textbox').first();
  await callerBox.fill(data.caller);
  log(`Entering caller phone: ${data.callerPhone}`);
  await page.getByRole('textbox').nth(1).fill(data.callerPhone);
  await expect(callerBox).toHaveValue(data.caller);
  log('Caller details entered successfully');

  // 4. Search for the member (submit with Enter) and select the match
  log(`Entering member name: ${data.memberName}`);
  await memberSearch.fill(data.memberName);
  await memberSearch.press('Enter');
  log('Selecting member from search results');
  await page.getByRole('row', { name: new RegExp(data.memberName) }).click();
  await expect(page.getByRole('link', { name: new RegExp(data.expectedMemberNameInTab) })).toBeVisible();
  log(`Member name '${data.expectedMemberNameInTab}' verified successfully in ticket details`);

  return { ticketId, baseline };
}
