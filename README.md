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

Prompt:

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

👤 Author

Vidhya Veeranan

