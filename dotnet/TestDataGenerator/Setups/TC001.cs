using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    public class TC001 : QCTestSetup
    {
        private const string _testCaseId = "001";
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
        
        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the _tcPrefix.
        /// </summary>
        private void SetupVariables()
        {
            // Caller Variables
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);
            _caller = Common.UseCompValue(TestPrefix, "Caller");

            // Member Variables
            _memberLast = Common.UseCompValue(TestPrefix, "ML");
            _memberFirst = Common.UseCompValue(TestPrefix, "MF");
            _memberPID = Common.UseCompValue(TestPrefix, "MPID");
        }

        public TC001() : base()
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
		/// Setup method contains all check and creation of QC data needed for the test case.
		/// </summary>
		public void Setup()
        {
            LoggerContext.Log.Message($"Running test setup for {_testCaseId}.");

            // Set Test Variables
            SetupVariables();

            try
            {
                #region Member Setup

                // Member and Eligibility
                var memberID = Controllers.QCController.Members.ReadMemberName(_memberLast, _memberFirst);

                if (memberID == 0)
                {
                    // Only look up reference data when a member actually needs to be created
                    var gender = testHelper.PickRandom(Controllers.QCController.ClaimsCommon.GetAllGender());
                    var maritalStatus = testHelper.PickRandom(Controllers.QCController.ClaimsCommon.GetAllMaritalStatus());
                    var memberIdentifierType = testHelper.PickRandom(Controllers.QCController.ClaimsCommon.GetAllMemberIdType());

                    memberID = Controllers.QCController.Members.CreateMember(_memberLast, _memberFirst, _memberDOB);
                    Controllers.QCController.Members.UpdateMemberGender(memberID, gender);
                    Controllers.QCController.Members.UpdateMemberMaritalStatus(memberID, maritalStatus);
                    Controllers.QCController.Members.CreateMemberPersonalIdentifier(memberID, _memberPID, memberIdentifierType);
                    LoggerContext.Log.Message("Created member - " + _memberPID + ".");
                }
                
                LoggerContext.Log.Message($"Checked for or created member: {_memberPID}");

                #endregion
            }
            catch (Exception ex)
            {
                LoggerContext.Log.Error(ex);
            }
        }

        /// <summary>
        /// WriteTestData method creates a csv datasource file with the test data uds needed for the test case.
        /// </summary>
        public void WriteTestData()
        {
            LoggerContext.Log.Message($"Writing test setup data for {_testCaseId}.");

            // Scenario Data json file creation
            var testData = new Dictionary<string, string>
            {
                { "Caller", _caller },
                { "CallerPhone", _callerPhone },
                { "SearchMemberName", _memberLast},
                { "ExpectedMemberNameInTab", _memberLast}
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message($"Created test setup data file.");
        }
    }
}
