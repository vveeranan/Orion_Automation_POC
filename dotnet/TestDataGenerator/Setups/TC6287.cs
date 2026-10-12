using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6287: QC Orion - Create a New Provider Ticket
    /// The ticket itself is created in the Orion UI. This setup guarantees the provider the ticket is searched against exists in QC.
    /// </summary>
    public class TC6287 : QCTestSetup
    {
        private const string _testCaseId = "6287";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Caller Variables
        private string _caller;
        private string _callerPhone = "1" + new Random().Next(100000000, 1000000000).ToString();

        // Provider Variables
        private string _providerName;
        private string _providerNPI;

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
        }

        public TC6287() : base()
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
                { "ProviderNPI", _providerNPI }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
