using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6292: QC Orion - Create a New Provider Ticket Task
    /// The provider ticket and its task are created in the Orion UI. This setup guarantees the provider the ticket is searched
    /// against exists in QC, and generates the unique task title and notes for the test.
    /// </summary>
    public class TC6292 : QCTestSetup
    {
        private const string _testCaseId = "6292";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Caller Variables
        private string _caller;
        private string _callerPhone = "1" + new Random().Next(100000000, 1000000000).ToString();

        // Provider Variables
        private string _providerName;
        private string _providerNPI;

        // Task Variables
        private string _taskTitle;
        private string _taskNotes;

        private DateTime _fromDate = DateTime.Today.AddYears(-1);

        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the TestPrefix.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

            // Caller Variables
            _caller = Common.UseCompValue(TestPrefix, "Caller");

            // Provider Variables
            _providerName = Common.UseCompValue(TestPrefix, "PN");
            _providerNPI = Common.UseCompValue(TestPrefix, "NPI");

            // Task Variables
            _taskTitle = Common.UseCompValue(TestPrefix, "TT");
            _taskNotes = $"{Common.UseCompValue(TestPrefix, "TT")} Notes";
        }

        public TC6292() : base()
        {
            Results = new TestResults();
        }

        public override string ToString()
        {
            return _testCaseId;
        }

        public override TestResults Run()
        {
            Setup();
            WriteTestData();

            return Results;
        }

        /// <summary>
        /// Setup method contains all check and creation of data needed for the test case.
        /// </summary>
        public void Setup()
        {
            LoggerContext.Log.Message($"Running test setup for {_testCaseId}.");

            // Set Test Variables
            SetupVariables();

            try
            {
                #region Provider Setup

                // The provider must exist in QC so it can be found with the provider search on the new ticket
                var provIdentifierID = Controllers.QCController.Providers.ReadProviderIdentifier(_providerNPI);
                if (provIdentifierID == 0)
                {
                    var providerID = Controllers.QCController.Providers.CreateProvider("Provider");
                    provIdentifierID = Controllers.QCController.Providers.CreateProviderIdentifier(providerID, "NPI", _providerNPI, true, _fromDate, null);
                    Controllers.QCController.Providers.CreateProviderName(providerID, _providerName, "", "", "Company", true);
                }
                LoggerContext.Log.Message($"Checked for or created provider - {_providerNPI}.");

                #endregion

                #region Task Setup

                // The test creates the task in the UI, so it must not exist yet.
                if (WorkerPortalLookups.TaskExists(_taskTitle))
                {
                    LoggerContext.Log.Message($"WARNING: task {_taskTitle} already exists. Increment the iteration before running the test.");
                }
                LoggerContext.Log.Message($"Checked that task does not exist: {_taskTitle}");

                #endregion
            }
            catch (Exception ex)
            {
                LoggerContext.Log.Error(ex);
            }
        }

        /// <summary>
        /// WriteTestData method creates a json datasource file with the test data needed for the test case.
        /// </summary>
        public void WriteTestData()
        {
            LoggerContext.Log.Message($"Writing test setup data for {_testCaseId}.");

            // Scenario Data json file creation
            var testData = new Dictionary<string, string>
            {
                { "Caller", _caller },
                { "CallerPhone", _callerPhone },
                { "SearchProviderName", _providerName },
                { "ExpectedProviderNameInTab", _providerName },
                { "ProviderNPI", _providerNPI },
                { "TaskTitle", _taskTitle },
                { "TaskNotes", _taskNotes }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
