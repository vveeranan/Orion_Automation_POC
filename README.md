Playwright Test Automation with Claude Code
📌 Overview

This project focuses on automated testing using Playwright with the assistance of Claude Code to help create, maintain, and execute browser automation tests.

The project is developed using Visual Studio Code (VS Code) and aims to simplify end-to-end (E2E) testing, improve test coverage, and make test automation more efficient.

🛠️ Tech Stack
Playwright – Browser automation and end-to-end testing
Claude Code – AI-assisted test creation, debugging, and automation
Visual Studio Code – Development environment
Node.js & npm – JavaScript runtime and package management
Git & GitHub – Version control and repository management

🚀 Getting Started
Prerequisites

Make sure you have the following installed:

Node.js
Visual Studio Code
Git
Claude Code
Playwright
Installation

1. Clone the repository

git clone <YOUR_GITHUB_REPOSITORY_URL>


2. Navigate to the project directory

cd <YOUR_PROJECT_FOLDER>


3. Install dependencies

npm install


4. Install Playwright browsers

npx playwright install

▶️ Running Tests

Run all Playwright tests

npx playwright test


Run tests in headed mode

npx playwright test --headed


Run tests in a specific browser

npx playwright test --project=chromium


Run a specific test file

npx playwright test tests/example.spec.ts


View the HTML test report

npx playwright show-report

🤖 Using Claude Code

Claude Code can assist with writing and maintaining Playwright tests, analyzing test failures, improving selectors, and debugging automation scripts.

Example tasks:

Generate Playwright test cases for a web application.
Create reusable page objects and test utilities.
Debug failed test cases and suggest fixes.
Improve test coverage for critical user workflows.
Review existing automation scripts and suggest improvements.

Prompt 1:

Act an automation tester. Create tests by following the instructions below:
1. Make use of the dlls C:\AutoCommonFiles\Support\Libraries\Automation\QC\DataEntry\SQL\Core\2025.2000.1\Automation.QC.DataEntry.SQL.Core.dll, 
C:\AutoCommonFiles\Support\Libraries\Automation\OrionWorkerPortal\DataEntry\SQL\2025.2.1\Automation.Orion.DataEntry.SQL.WorkerPortal.dll.
2. First create setup under Setups folder by using the above dll methods for each test case as required
3. Use Smoke.spec.ts to create all the tests
4. Assign categories for each test like Smoke, Member, Provider
5. Provide enough comments for the test steps 
6. After generating the smoke tests, record it under TestSteps for each file
7. Test Steps:
   6296: QC Orion - Create a Queued Claim Task and View in My Tasks
    1. Create a queue, select it, click assignments button and assign to the logged in user, then click criteria button and add a dental claim form type and remove it. -           Create a function called reload queues so that it can be used across multiple spec.ts files.
    2. After reloading the queues, go to My Claims queue page, search for the created claim and select it., 
    3. Click tasks tab and add a task to the claim
    4. Go to My Tasks page and verify if the task is displayed
  
Prompt 2:

Act an automation tester. Understand the requirement at Desktop\RT27053_Feature_Summary.docx  and create tests by following the instructions below:
1. Make use of the dlls C:\AutoCommonFiles\Support\Libraries\Automation\QC\DataEntry\SQL\Core\2025.2000.1\Automation.QC.DataEntry.SQL.Core.dll, 
C:\AutoCommonFiles\Support\Libraries\Automation\OrionWorkerPortal\DataEntry\SQL\2025.2.1\Automation.Orion.DataEntry.SQL.WorkerPortal.dll.
2. First create setup under Setups folder by using the above dll methods for each test case as required
3. Use RT27053.spec.ts to create all the tests
4. Assign relavant categories for each test including regression
5. Provide enough comments for the test steps 
6. After generating the tests, record it under TestSteps for each file
Here is the test case list: 

16966	: TaskKPI_WhenAuthorizedUserOpensConfiguration_ShouldShowTaskKPIs, Release ORION 2025.2000.1
16967	: TaskKPI_WhenUserSelectsTaskKPIs_ShouldShowTaskDefinitions, Release ORION 2025.2000.1
16968	: TaskKPI_WhenUserEnablesTaskKPI_ShouldSaveConfiguration, Release ORION 2025.2000.1
16969	: TaskKPI_WhenUserDisablesTaskKPI_ShouldHideFromMyTask, Release ORION 2025.2000.1
16970	: TaskKPI_WhenConfigured_ShouldDisplayInMyTask, Release ORION 2025.2000.1
16971	: TaskKPI_WhenAllTaskKPIsConfigured_ShouldDisplayEachTile, Release ORION 2025.2000.1
16972	: TaskKPI_WhenLabelIsRendered_ShouldUseKPIsCapitalization, Release ORION 2025.2000.1
16973	: TaskKPI_WhenNoTaskKPIIsEnabled_ShouldShowApprovedEmptyState, Release ORION 2025.2000.1
16974	: TaskKPI_WhenNoDataIsReturned_ShouldShowApprovedNoDataState, Release ORION 2025.2000.1
16975	: TaskKPI_WhenTasksCreatedDataExists_ShouldDisplayApprovedValue, Release ORION 2025.2000.1
16976	: TaskKPI_WhenTasksResolvedDataExists_ShouldDisplayApprovedValue, Release ORION 2025.2000.1
16977	: TaskKPI_WhenResolutionDataExists_ShouldDisplayApprovedValue, Release ORION 2025.2000.1
16978	: TaskKPI_WhenCloseDataExists_ShouldDisplayApprovedValue, Release ORION 2025.2000.1
16979	: TaskKPI_WhenTaskDataReachesBoundary_ShouldApplyApprovedCalculation, Release ORION 2025.2000.1
16980	: TaskKPI_WhenBenchmarkIsMissing_ShouldApplyApprovedVisibility, Release ORION 2025.2000.1
16981	: TaskKPI_WhenMeasurementPeriodIsMissing_ShouldApplyApprovedVisibility, Release ORION 2025.2000.1
16982	: TaskKPI_WhenServiceFails_ShouldShowApprovedErrorState, Release ORION 2025.2000.1
16983	: TaskKPI_WhenDataIsRefreshing_ShouldApplyApprovedRefreshBehavior, Release ORION 2025.2000.1
16984	: TaskKPI_WhenUserOpensTile_ShouldShowApprovedKPIInformation, Release ORION 2025.2000.1
16985	: TaskKPI_WhenUserLacksPermission_ShouldHideRestrictedResults, Release ORION 2025.2000.1
16986	: TaskKPI_WhenClaimsQueueLoads_ShouldPreserveExistingKPIs, Release ORION 2025.2000.1
16987	: TaskKPI_WhenTicketsLoads_ShouldPreserveExistingKPIs, Release ORION 2025.2000.1
16988	: TaskKPI_WhenExistingKPIIsMisconfigured_ShouldHideItsTile, Release ORION 2025.2000.1
16989	: TaskKPI_WhenExistingKPIUsesBenchmark_ShouldValidateBenchmarkValue, Release ORION 2025.2000.1
16990	: TaskKPI_WhenExistingKPISettingsOpen_ShouldPreserveRefreshOptions, Release ORION 2025.2000.1

Start Claude Code from the project directory using:

claude


Then provide instructions describing the test scenario you want to automate.

📊 Test Reports

Playwright generates test results and can create an HTML report to help analyze:

Passed and failed tests
Execution duration
Error messages and stack traces
Screenshots and traces when configured

Generate and view the report using:

npx playwright test
npx playwright show-report

## 📂 Project Structure

This project automates end-to-end tests of the **Orion** web application. Each test needs data to exist in Orion first (a member, a queue, a group, and so on). A .NET tool creates that data, then Playwright drives the browser using it.

```
Orion_Automation_POC/
├── tests/                  # The Playwright test cases (what actually runs)
├── fixtures/               # Playwright fixture that supplies test data to each test
├── utils/                  # Reusable helper functions and flows (login, create ticket, ...)
├── types/                  # TypeScript type definitions for the test data
├── dotnet/
│   └── TestDataGenerator/  # C# console app that creates test data in Orion
│       ├── Setups/         # One setup class per test case (TC<id>.cs)
│       └── Support/        # Shared helpers used by the setups
├── TestSteps/              # Plain-English description of every test case (TC<id>.md)
├── specs/                  # Test plans written in Markdown (used by the Playwright planner agent)
├── playwright.config.ts    # Playwright settings (browser, reporters, base URL)
├── package.json            # npm dependencies and scripts
├── .env.example            # Template for the credentials file (.env)
├── .mcp.json               # Playwright MCP server config for Claude Code
└── MTM_Update.txt          # Generated after each run: pass/fail list for Microsoft Test Manager
```

### Folder details

| Folder / File | Purpose |
| --- | --- |
| `tests/` | Test files named `*.spec.ts`. `RT25957.spec.ts` and `RT27053.spec.ts` hold the regression tests for those work items, `Smoke.spec.ts` is a smoke test, and `seed.spec.ts` is only a login seed used by the Claude/Playwright planner and generator agents (it is skipped in normal runs). Test titles start with the test case id, for example `TC16966 ...`. That id links the test to its data setup and its results. |
| `fixtures/` | `testData.fixture.ts` extends Playwright's `test`. Before each test it takes the test case id from the title, runs the C# generator and hands the resulting data to the test as `testData`. It also writes a log file for every test. Tests import `test` and `expect` from here instead of from `@playwright/test`. |
| `utils/` | Helpers shared by the tests. Reusable flows: `auth.ts` (log in), `memberCall.ts` and `providerCall.ts` (create tickets), `reloadQueues.ts`, `tickets.ts`, `grid.ts`, `kpi.ts`. Plumbing: `credentials.ts` (reads `.env`), `csharpRunner.ts` (runs the C# generator and reads its JSON output), `buildTestDataGenerator.ts` (builds the C# project), `incrementIteration.ts` (global setup), `logger.ts` (per-test logs), `mtmReporter.ts` (writes `MTM_Update.txt`). See [utils/README.md](utils/README.md) for the list of flows. |
| `types/` | `testData.ts` describes the shape of the data the generator produces. |
| `dotnet/TestDataGenerator/` | .NET Framework console app. It receives a test case id, runs the matching class in `Setups/` to create the data in Orion, and writes `ScenarioData/<id>Data.json` for the test to read. `Program.cs` is the entry point, `Setups/SetupTemplate.cs` is the template for a new setup, and `Support/` holds shared helpers. |
| `TestSteps/` | One Markdown file per test case with its name, categories, the data the setup creates, and the numbered steps and checks. Read these first to learn what a test does. |
| `specs/` | Markdown test plans (for example `Smoke.md`) used to generate new tests with Claude Code and Playwright. |

### How a test run flows

```
npx playwright test
   │
   ├─ 1. Global setup builds the C# TestDataGenerator and bumps the run iteration
   ├─ 2. For each test (e.g. "TC16966 ...") the testData fixture runs
   │       TestDataGenerator.exe TC16966  →  creates data in Orion
   │                                      →  writes ScenarioData/TC16966Data.json
   ├─ 3. The test logs in to Orion, uses the data and checks the results
   └─ 4. Reports are written: Allure results, per-test logs and MTM_Update.txt
```

### Generated folders (not committed)

These are created when you run the tests and are listed in `.gitignore`: `node_modules/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`, `dotnet/**/bin`, `dotnet/**/obj`, `dotnet/TestDataGenerator/ScenarioData/*.json` and `*.log`.

### Adding a new test

1. Describe it in `TestSteps/TC<id>.md`.
2. Copy `dotnet/TestDataGenerator/Setups/SetupTemplate.cs` to `TC<id>.cs` and set up the data it needs.
3. Add a test whose title starts with `TC<id>` in `tests/`, import `test` from `fixtures/testData.fixture.ts` and reuse the helpers in `utils/`.

### Configuration

- Copy `.env.example` to `.env` and fill in the Orion credentials. Never commit `.env`.
- Visual Studio 2022 (MSBuild) is needed to build the C# generator. Set `MSBUILD_PATH` if it is installed somewhere else.
- Run `npm run allure:generate` or `npm run allure:serve` to view the Allure report.

👤 Author

Vidhya Veeranan

