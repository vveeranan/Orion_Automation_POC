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

### 2. Ticket creation (member and provider)

**Seed:** `tests/seed.spec.ts`

Both tests create a real ticket by choosing a call type on `#/newticket` (the ticket is created immediately, see above) and use the same steps as TC001. Categories: `@Smoke`, `@Ticket` plus `@Member` / `@Provider`.

#### 2.1. TC6286 Create a new member ticket

**File:** `tests/Smoke.spec.ts` | **Test data:** `ScenarioData/TC6286Data.json` | **Setup:** `Setups/TC6286.cs` (creates the member in QC)

Fields: `Caller`, `CallerPhone`, `SearchMemberName`, `ExpectedMemberNameInTab`. Steps: see `TestSteps/TC6286.md`.

#### 2.2. TC6287 Create a new provider ticket

**File:** `tests/Smoke.spec.ts` | **Test data:** `ScenarioData/TC6287Data.json` | **Setup:** `Setups/TC6287.cs` (creates the provider with an NPI in QC)

Fields: `Caller`, `CallerPhone`, `SearchProviderName`, `ExpectedProviderNameInTab`, `ProviderNPI`. Steps: see `TestSteps/TC6287.md`. Unlike 'Member Call', clicking 'Provider Call' does not create the ticket: the page stays on `#/newticket` (message 'Provider is required.') and the ticket is created when the provider is selected.

### 3. Administration (groups and queues)

**Seed:** `tests/seed.spec.ts`

Observed: Administration menu links are `#/groups`, `#/queues`. 'Add Group' / 'Add Queue' open a dialog with 'Name', 'Description' and 'Save'. The queues grid has columns ID, Name, Description, Count, Schedules, Update Status, Actions (Delete / Disable) and an 'Add New Schedule' link to `#/queueschedules`.

#### 3.1. TC6288 Create a new group

**Categories:** `@Smoke`, `@Group`, `@Administration` | **Test data:** `ScenarioData/TC6288Data.json` (`GroupName`, `GroupDescription`) | **Setup:** `Setups/TC6288.cs` | Steps: `TestSteps/TC6288.md`

#### 3.2. TC6289 Create a new queue

**Categories:** `@Smoke`, `@Queue`, `@Administration` | **Test data:** `ScenarioData/TC6289Data.json` (`QueueName`, `QueueDescription`) | **Setup:** `Setups/TC6289.cs` | Steps: `TestSteps/TC6289.md`

#### 3.3. TC6290 Create a new queue schedule

**Categories:** `@Smoke`, `@Queue`, `@Schedule`, `@Administration` | **Test data:** `ScenarioData/TC6290Data.json` (`QueueName`, `ScheduleName`, `ScheduleDescription`) | **Setup:** `Setups/TC6290.cs` (creates the queue to assign) | Steps: `TestSteps/TC6290.md`

Observed: the schedule page has no Save button; it autosaves via POST `/api/queueschedules` once name and description are both filled (name only returns 400 'must have Description!'). Queue grid: 10 per page, page-size menu offers up to 20, search box does not filter, queues created in the UI start disabled ('Enable' button). Selecting a queue on the schedule page moves it to 'Queue Assignment' but no extra save request is sent, so the assignment is not asserted beyond that UI change.

### 4. Ticket tasks

**Seed:** `tests/seed.spec.ts`

Observed: a ticket's 'Tasks' tab shows 'No Tasks' and an 'Add Task' button. The task form (Title, Due Date, Assigned To, Priority, Status, Category, Subject, Reason, Description, Resolution) has no Save button: the task is created by `POST /api/tickets/{id}/tasks` as soon as the title is filled and later edits save automatically. The Tasks tab badge shows the task count and a closed form lists the task as a collapsible button named by its title. A task with a blank 'Assigned To' does not appear on My Tasks; Administration > Tasks (`#/tasks`) lists all tasks with an 'N Tasks' count (paged at 10, so tests verify the count).

#### 4.1. TC6291 Create a new member ticket task

**Categories:** `@Smoke`, `@Member`, `@Ticket`, `@Task` | **Test data:** `ScenarioData/TC6291Data.json` (`Caller`, `CallerPhone`, `SearchMemberName`, `ExpectedMemberNameInTab`, `TaskTitle`, `TaskNotes`) | **Setup:** `Setups/TC6291.cs` (creates the member in QC) | Steps: `TestSteps/TC6291.md`

#### 4.2. TC6292 Create a new provider ticket task

**Categories:** `@Smoke`, `@Provider`, `@Ticket`, `@Task` | **Test data:** `ScenarioData/TC6292Data.json` (`Caller`, `CallerPhone`, `SearchProviderName`, `ExpectedProviderNameInTab`, `ProviderNPI`, `TaskTitle`, `TaskNotes`) | **Setup:** `Setups/TC6292.cs` (creates the provider with an NPI in QC) | Steps: `TestSteps/TC6292.md`

### 5. Queues and claims

**Seed:** `tests/seed.spec.ts`

Observed: selecting a queue opens `#/queues/{id}` with Reload, History, Criteria and Assignments buttons. Assignments is a side panel: click a user (or group) button to assign it. Criteria is a side panel with a 'filter criteria' box; typing filters the criteria types, clicking one (e.g. 'Claim Form Type') expands a Not?/Value table, 'Add' adds a row whose value drop down offers Dental, Institutional, Professional and Predetermination, and 'Remove' deletes the row. Opening a queue by clicking its row in a freshly re-sorted grid once opened a different queue, so tests open it by the id returned when it was created. The My Claims Queue 'Queue' filter (`GET /api/claimsqueue/queues`) lists only queues the user is assigned to that hold claims.

#### 5.1. TC6295 Create a queue, enable it and view it in My Claims Queue

**Categories:** `@Smoke`, `@Queue`, `@Claims`, `@Administration` | **Test data:** `ScenarioData/TC6295Data.json` (`QueueName`, `QueueDescription`) | **Setup:** `Setups/TC6295.cs` | Steps: `TestSteps/TC6295.md`

#### 5.2. TC6296 Create a queued claim task and view it in My Tasks

**Categories:** `@Smoke`, `@Queue`, `@Claims`, `@Task`, `@Administration` | **Test data:** `ScenarioData/TC6296Data.json` (`QueueName` = ALL CLAIMS, `QueueDescription`, `ClaimUD`, `SearchMemberName`, `ProviderNPI`, `TaskTitle`, `TaskNotes`) | **Setup:** `Setups/TC6296.cs` (claim chain as in TC002; the claim is adjudicated and ends up Approved) | Steps: `TestSteps/TC6296.md`

Observed: Steps 1-5 are the shared function `reloadQueues` in `utils/queues.ts`, here used on the existing ALL CLAIMS queue (`create: false`): select the queue, assign the user unless already assigned, add and remove a Dental 'Claim Form Type' criterion in the Criteria popup (`#edit-criteria`; each Add click saves an empty criterion at once and the row is slow to appear), then reload. After a reload the claim is queued even though it is Approved. In My Claims Queue the search needs the grid to have loaded first; clicking the claim activates it and opens a left-hand panel with a Tasks tab, whose task form is the same as a ticket's. A task only shows on My Tasks when assigned to the user, and that page shows a placeholder '0 Tasks' until its data arrives.

### 6. About Orion

**Seed:** `tests/seed.spec.ts`

Observed: the profile icon (`a#main-user-status.dropdown-toggle`) opens a menu with an 'About Orion' link (`a[data-target='#about-orion']`) that opens the `#about-orion` popup, titled 'About Orion', with a striped table of component / version rows: Orion Worker Portal, Authorizations API, Claims API, Enums API, Members API, Notes API, Providers API, Referrals API, Storage API, Claims System and Domain Database.

#### 6.1. TC6297 Open About Orion form

**Categories:** `@Smoke`, `@AboutOrion` | **Test data:** `ScenarioData/TC6297Data.json` (`OrionWorkerPortalVersion`, `AuthorizationsApiVersion`, `ClaimsApiVersion`, `EnumsApiVersion`, `MembersApiVersion`, `NotesApiVersion`, `ProvidersApiVersion`, `ReferralsApiVersion`, `StorageApiVersion`, `ClaimsSystemVersion`) | **Setup:** `Setups/TC6297.cs` (runs `Get-Orion-Services-Versions.ps1`, remotely on the services server when the web server folder is not local, and reads the latest QC system update with `ClaimsCommon.GetAllSystemUpdates()`) | Steps: `TestSteps/TC6297.md`

The Domain Database row is not verified.
