using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6290: QC Orion - Create a New Queue Schedule
    /// The schedule itself is created in the Orion UI (Administration > Queues > Add New Schedule). This setup creates the
    /// queue the schedule is assigned to and generates the unique schedule name and description.
    /// </summary>
    public class TC6290 : QCTestSetup
    {
        private const string _testCaseId = "6290";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Queue Variables
        private string _queueName;
        private string _queueDescription;

        // Queue Schedule Variables
        private string _scheduleName;
        private string _scheduleDescription;

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

            // Queue Schedule Variables
            _scheduleName = Common.UseCompValue(TestPrefix, "QS");
            _scheduleDescription = $"{Common.UseCompValue(TestPrefix, "QS")} Description";
        }

        public TC6290() : base()
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

                // The schedule needs an existing, active queue to be assigned to
                var queueID = WorkerPortalLookups.ReadQueueId(_queueName);
                if (queueID == 0)
                {
                    queueID = Controllers.OrionWorkerPortalController.Queues.CreateQueue(_queueName, _queueDescription, true);
                }
                LoggerContext.Log.Message($"Checked for or created queue - {_queueName}.");

                #endregion

                #region Queue Schedule Setup

                // The test creates the schedule in the UI, so it must not exist yet.
                var scheduleID = WorkerPortalLookups.ReadQueueScheduleId(_scheduleName);
                if (scheduleID != Guid.Empty)
                {
                    LoggerContext.Log.Message($"WARNING: queue schedule {_scheduleName} already exists. Increment the iteration before running the test.");
                }
                LoggerContext.Log.Message($"Checked that queue schedule does not exist: {_scheduleName}");

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
                { "ScheduleName", _scheduleName },
                { "ScheduleDescription", _scheduleDescription }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
