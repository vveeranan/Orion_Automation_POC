using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6291: QC Orion - Create a New Member Ticket Task
    /// The member ticket and its task are created in the Orion UI. This setup guarantees the member the ticket is searched
    /// against exists in QC, and generates the unique task title and notes for the test.
    /// </summary>
    public class TC6291 : QCTestSetup
    {
        private const string _testCaseId = "6291";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Caller Variables
        private string _caller;
        private string _callerPhone = "1" + new Random().Next(100000000, 1000000000).ToString();

        // Member Variables
        private string _memberLast;
        private string _memberFirst;
        private string _memberPID;
        private DateTime _memberDOB = DateTime.Today.AddDays(-new Random().Next(30 * 365, 101 * 365));

        // Task Variables
        private string _taskTitle;
        private string _taskNotes;

        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the TestPrefix.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

            // Caller Variables
            _caller = Common.UseCompValue(TestPrefix, "Caller");

            // Member Variables
            _memberLast = Common.UseCompValue(TestPrefix, "ML");
            _memberFirst = Common.UseCompValue(TestPrefix, "MF");
            _memberPID = Common.UseCompValue(TestPrefix, "MPID");

            // Task Variables
            _taskTitle = Common.UseCompValue(TestPrefix, "TT");
            _taskNotes = $"{Common.UseCompValue(TestPrefix, "TT")} Notes";
        }

        public TC6291() : base()
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
                #region Member Setup

                // The member must exist in QC so it can be found with the member search on the new ticket
                var memberID = Controllers.QCController.Members.ReadMemberName(_memberLast, _memberFirst);

                if (memberID == 0)
                {
                    // Only look up reference data when a member actually needs to be created
                    // Reference values known to exist in QC (the QC DLL in use has no GetAll... lookups for these)
                    var gender = "Male";
                    var maritalStatus = "Single";
                    var memberIdentifierType = "PID";

                    memberID = Controllers.QCController.Members.CreateMember(_memberLast, _memberFirst, _memberDOB);
                    Controllers.QCController.Members.UpdateMemberGender(memberID, gender);
                    Controllers.QCController.Members.UpdateMemberMaritalStatus(memberID, maritalStatus);
                    Controllers.QCController.Members.CreateMemberPersonalIdentifier(memberID, _memberPID, memberIdentifierType);
                    LoggerContext.Log.Message("Created member - " + _memberPID + ".");
                }

                LoggerContext.Log.Message($"Checked for or created member: {_memberPID}");

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
                { "SearchMemberName", _memberLast },
                { "ExpectedMemberNameInTab", _memberLast },
                { "TaskTitle", _taskTitle },
                { "TaskNotes", _taskNotes }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
