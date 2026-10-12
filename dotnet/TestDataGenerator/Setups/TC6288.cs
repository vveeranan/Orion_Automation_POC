using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6288: QC Orion - Create a New Group
    /// The group itself is created in the Orion UI (Administration > Groups). This setup generates the unique group name
    /// and description for the test and confirms they are not already in the Orion Worker Portal database.
    /// </summary>
    public class TC6288 : QCTestSetup
    {
        private const string _testCaseId = "6288";
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

        public TC6288() : base()
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

                // The test creates the group in the UI, so it must not exist yet. A leftover from a previous run
                // with the same iteration would make the new group indistinguishable from the old one.
                var groupID = WorkerPortalLookups.ReadGroupId(_groupName, _groupDescription);
                if (groupID != 0)
                {
                    LoggerContext.Log.Message($"WARNING: group {_groupName} already exists (id {groupID}). Increment the iteration before running the test.");
                }
                LoggerContext.Log.Message($"Checked that group does not exist: {_groupName}");

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
