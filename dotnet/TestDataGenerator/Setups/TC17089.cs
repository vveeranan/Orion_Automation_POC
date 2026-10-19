using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 17089: Administration - Group KPIs - Edit KPI, Style offers Bar and Ticker and each saves
    /// Release ORION 2025.2000.1 (RT-25957 - Group KPIs).
    /// The Group KPIs configuration is exercised in the Orion UI. KPI configuration is stored per group, so this setup creates
    /// the group the test configures its KPIs on (Orion Worker Portal DLL: Groups.CreateGroup) and generates the unique names
    /// and the values the test uses.
    /// </summary>
    public class TC17089 : QCTestSetup
    {
        private const string _testCaseId = "17089";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Group Variables
        private string _groupName;
        private string _groupDescription;

        // KPI Variables (values the test uses)
        private string _kpiName = "Claims Pending";
        private string _benchmarkValue = "3";

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

        public TC17089() : base()
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

                // The group the KPIs are configured on (read-or-create, so a rerun reuses it). The test assigns the logged in user to it in the UI.
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
                { "GroupDescription", _groupDescription },
                { "KpiName", _kpiName },
                { "BenchmarkValue", _benchmarkValue }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
