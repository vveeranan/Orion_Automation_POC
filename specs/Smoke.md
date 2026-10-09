# Ticket Creation - Member Call

## Application Overview

Orion (hash-routed SPA, http://tillamook22.applegate.local:8100/#/login). Covers login, navigating Customer Service > My Tickets (#/mytickets), Add Ticket (#/newticket) and creating a ticket by choosing "Member Call". Credentials come from env vars ORION_USERNAME / ORION_PASSWORD loaded via utils/credentials.ts getCredentials() (the stored password is Base64-encoded and decoded there); never hard-code them. Observed: choosing a call type on #/newticket IMMEDIATELY creates a ticket and redirects to #/tickets/{id} (server-assigned incrementing id, status Open); there is no separate Save step. Tests create real tickets, so assert on the id captured from the URL rather than on fixed numbers. Starting state: fresh browser, logged out. Console errors (non-fatal) appear during navigation; ignore unless asserting on them.

Test data: every test case reads its data from the `testData` fixture (fixtures/testData.fixture.ts), which runs the C# TestDataGenerator for the test case id (the first word of the test title) and loads `dotnet/TestDataGenerator/ScenarioData/{TestCaseId}Data.json`. Never hard-code test data in the spec; use the fields below.

## Test Scenarios

### 1. Member Call ticket creation

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC001 Create member call ticket

**File:** `tests/Smoke.spec.ts`

**Test data:** `ScenarioData/TC001Data.json` (via `testData` fixture)

| Field | Used for |
| --- | --- |
| `Caller` | value typed into the 'caller' textbox |
| `CallerPhone` | value typed into the 'caller phone' textbox |
| `SearchMemberName` | value typed into the 'member search' textbox |
| `ExpectedMemberNameInTab` | member name expected on the ticket after the member is selected |

**Steps:**
  1. Login with ORION_USERNAME / ORION_PASSWORD (via getCredentials()), then navigate to Customer Service > My Tickets
    - expect: URL is #/mytickets; heading 'Tickets - My Unresolved Tickets'; 'Add Ticket' link is visible
    - Record the ticket count label (e.g. 'N Tickets') as the baseline
  2. Click link 'Add Ticket', then click button 'Member Call'
    - expect: A ticket is created immediately and URL changes to #/tickets/{id}; capture {id} from the URL
    - expect: Header reads 'Ticket #{id} Status' with 'Open' highlighted and Delegated/Resolved enabled; 'New' button enabled
    - expect: The 'Type of Call is required' validation message is gone
    - expect: A 'Same as Caller' button and a 'member search' textbox with search button appear
    - expect: Created By shows the logged-in user; Assigned To defaults to the logged-in user; Stop Date/Time empty
  3. Type `testData.Caller` in 'caller' and `testData.CallerPhone` in 'caller phone'
    - expect: Values are accepted
  4. Type `testData.SearchMemberName` in 'member search', click search and select the matching member
    - expect: Member `testData.ExpectedMemberNameInTab` is shown on the ticket
  5. Navigate to #/mytickets
    - expect: New ticket {id} appears at top of 'My Unresolved Tickets' with Ticket Type 'Member', Status 'Open', Caller `testData.Caller`, Created By the logged-in user, and the ticket count is baseline + 1
