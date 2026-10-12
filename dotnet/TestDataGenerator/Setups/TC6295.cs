using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6295: QC Orion - Create a Queue, Enable it and View in My Claims Queue
    /// The queue is created, enabled, assigned to the logged in user and given criteria in the Orion UI
    /// (Administration > Queues), then looked up in the My Claims Queue 'Queue' filter. That filter only lists queues
    /// the user is assigned to that hold claims, so the test gives the queue criteria that match claims already in QC.
    /// This setup generates the unique queue name and description and confirms the queue does not exist yet.
    /// </summary>
    public class TC6295 : QCTestSetup
    {
        private const string _testCaseId = "6295";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Queue Variables
        private string _queueName;
        private string _queueDescription;

        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the TestPrefix.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

            // Queue Variables
            _queueName = Common.UseCompValue(TestPrefix, "QN");
            _queueDescription = $"{Common.UseCompValue(TestPrefix, "QN")} Description";
        }

        public TC6295() : base()
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
                #region Queue Setup

                // The test creates the queue in the UI, so it must not exist yet.
                var queueID = WorkerPortalLookups.ReadQueueId(_queueName);
                if (queueID != 0)
                {
                    LoggerContext.Log.Message($"WARNING: queue {_queueName} already exists (id {queueID}). Increment the iteration before running the test.");
                }
                LoggerContext.Log.Message($"Checked that queue does not exist: {_queueName}");

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
                { "QueueName", _queueName },
                { "QueueDescription", _queueDescription }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
