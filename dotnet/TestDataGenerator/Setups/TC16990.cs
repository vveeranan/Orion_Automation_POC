using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 16990: TaskKPI_WhenExistingKPISettingsOpen_ShouldPreserveRefreshOptions
    /// Release ORION 2025.2000.1 (RT:27053 - KPI ribbon and KPI configuration).
    /// The KPI configuration, the KPI ribbon and the KPI Information dialog are exercised in the Orion UI. This setup creates
    /// the group the test configures its KPIs on (the KPI configuration is stored per group), and generates the unique names for the test.
    /// </summary>
    public class TC16990 : QCTestSetup
    {
        private const string _testCaseId = "16990";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Group Variables
        private string _groupName;
        private string _groupDescription;

        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the TestPrefix.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

            // Group Variables
            _groupName = Common.UseCompValue(TestPrefix, "GRP");
            _groupDescription = $"{Common.UseCompValue(TestPrefix, "GRP")} Description";
        }

        public TC16990() : base()
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
                #region Group Setup

                // The group the KPIs are configured on. The test assigns the logged in user to it in the UI.
                var groupID = WorkerPortalLookups.ReadGroupId(_groupName, _groupDescription);
                if (groupID == 0)
                {
                    groupID = Controllers.OrionWorkerPortalController.Groups.CreateGroup(_groupName, _groupDescription);
                }
                LoggerContext.Log.Message($"Checked for or created group - {_groupName} (id {groupID}).");

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
                { "GroupName", _groupName },
                { "GroupDescription", _groupDescription }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
