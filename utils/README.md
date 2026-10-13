# Reusable flows (templates)

Each flow is one function in its own file. Import it into any spec file and call it with the test data from the
`testData` fixture. All of them assume the user is already logged in unless stated.

| Template | File | What it does |
| --- | --- | --- |
| Log in | `auth.ts` `login(page)` | Logs in with ORION_USERNAME / ORION_PASSWORD, waits for the app to finish loading, returns the username. |
| Member Call | `memberCall.ts` `createMemberCall(page, data)` | My Tickets > Add Ticket > Member Call, enters caller and phone, searches for and selects the member. Returns `{ ticketId, baseline }`. |
| Provider Call | `providerCall.ts` `createProviderCall(page, data)` | My Tickets > Add Ticket > Provider Call, enters caller and phone, searches for and selects the provider (this creates the ticket). Returns `{ ticketId, baseline }`. |
| Reload queues | `reloadQueues.ts` `reloadQueues(page, { name, description, create? })` | Logs in, creates the queue (or selects an existing one with `create: false`, e.g. ALL CLAIMS), assigns it to the user, adds then removes a Dental Claim Form Type criterion, reloads it. Returns the queue id. |

Smaller pieces used by the templates (also usable on their own):

- `reloadQueues.ts`: `assignQueueToUser`, `setClaimFormTypeCriterion` (add a Claim Form Type criterion, optionally remove it), `reloadCurrentQueue` (click Reload and wait).
- `tickets.ts`: `openMyTickets` (returns the ticket count), `expectNewTicketListed` (new ticket is first and the count is up by one).
- `grid.ts`: `readCount` (reads an 'N Things' label once loaded), `reloadUntilVisible` (reloads a page that has not loaded its data), `sortQueuesNewestFirst`.

Example:

```ts
import { login } from '../utils/auth';
import { createMemberCall } from '../utils/memberCall';
import { expectNewTicketListed } from '../utils/tickets';

const username = await login(page);
const { ticketId, baseline } = await createMemberCall(page, {
  caller: testData.Caller,
  callerPhone: testData.CallerPhone,
  memberName: testData.SearchMemberName,
  expectedMemberNameInTab: testData.ExpectedMemberNameInTab,
});
await expectNewTicketListed(page, { baseline, ticketId, type: 'Member', caller: testData.Caller, username });
```

Notes:
- The Orion backend is slow, so these functions use generous waits and wait for saves rather than for fixed delays.
- Do not call `reloadUntilVisible` after typing into a form: the reload discards unsaved edits.
