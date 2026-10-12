using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6297: QC Orion - Open About Orion form
    /// The About Orion form is opened in the Orion UI. This setup works out the values the form must show:
    ///  - the Orion Worker Portal and API versions, taken from the output of Get-Orion-Services-Versions.ps1
    ///  - the Claims System version, taken from the latest QC system update in the QC database
    /// and writes them to the scenario data for the test to compare with the form.
    /// </summary>
    public class TC6297 : QCTestSetup
    {
        private const string _testCaseId = "6297";
        private const string _versionScriptPath = @"C:\ORION_Automation\Visual Studio\QC_Orion_Playwright_UI\QC_Orion_Playwright_UI\References\Get-Orion-Services-Versions.ps1";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Expected values for the About Orion form, keyed by the name used in the scenario data file
        private readonly Dictionary<string, string> _expectedVersions = new Dictionary<string, string>();

        // Scenario data name -> DLL name in the script output
        private static readonly Dictionary<string, string> _scriptDlls = new Dictionary<string, string>
        {
            { "OrionWorkerPortalVersion", "Plexis.Worker.Portal.dll" },
            { "AuthorizationsApiVersion", "Plexis.API.Authorizations.Services.dll" },
            { "ClaimsApiVersion", "Plexis.API.Claims.Services.dll" },
            { "EnumsApiVersion", "Plexis.API.Enums.Services.dll" },
            { "MembersApiVersion", "Plexis.API.Members.Services.dll" },
            { "NotesApiVersion", "Plexis.API.Notes.Services.dll" },
            { "ProvidersApiVersion", "Plexis.API.Providers.Services.dll" },
            { "ReferralsApiVersion", "Plexis.API.Referrals.Services.dll" },
            { "StorageApiVersion", "Plexis.API.Storage.Services.dll" }
        };

        #endregion

        /// <summary>
        /// SetupVariables method sets up the test prefix. This test needs no unique names.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);
        }

        public TC6297() : base()
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
        /// Setup method works out the values the About Orion form must show.
        /// </summary>
        public void Setup()
        {
            LoggerContext.Log.Message($"Running test setup for {_testCaseId}.");

            // Set Test Variables
            SetupVariables();

            try
            {
                #region Orion Worker Portal and API Versions

                // Run the build information script and pick out the version of each service DLL
                var scriptOutput = PowerShellRunner.GetOrionServiceVersions(_versionScriptPath, ServicesServer);

                foreach (var item in _scriptDlls)
                {
                    if (scriptOutput.TryGetValue(item.Value, out var version))
                    {
                        _expectedVersions[item.Key] = version;
                    }
                    else
                    {
                        LoggerContext.Log.Message($"WARNING: {item.Value} was not in the script output.");
                    }
                }
                LoggerContext.Log.Message($"Read {_expectedVersions.Count} service versions from Get-Orion-Services-Versions.ps1.");

                #endregion

                #region Claims System Version

                // The latest QC system update, shown as '<update> (QC_<yy>_<release>)', e.g. 2025.2000.0.00 (QC_25_2)
                var latestUpdate = Controllers.QCController.ClaimsCommon.GetAllSystemUpdates()
                    .Where(z => z.SystemUpdateNm.Contains("QC"))
                    .OrderByDescending(z => z.SystemUpdateUd)
                    .First();
                string versionNumber = latestUpdate.SystemUpdateUd;

                string year = versionNumber.Substring(0, 4).Substring(2);                    // '2025' -> '25'
                string release = versionNumber.Substring(versionNumber.Length - 9).Substring(0, 1); // '2000.0.00' -> '2'

                _expectedVersions["ClaimsSystemVersion"] = $"{versionNumber} (QC_{year}_{release})";
                LoggerContext.Log.Message($"Latest QC system update: {_expectedVersions["ClaimsSystemVersion"]}");

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
            testHelper.WriteTestScenarioData("TC" + _testCaseId, new Dictionary<string, string>(_expectedVersions));

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
