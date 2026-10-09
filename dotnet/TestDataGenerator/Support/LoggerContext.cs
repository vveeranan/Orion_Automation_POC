using Automation.Logging;
using System;

namespace TestDataGenerator
{
	public class LoggerContext
	{
		public static string PassedTestCasesList { get; set; }
		public static string FailedTestCasesList { get; set; }

		public static string UpdateMTMFilePath = AppDomain.CurrentDomain.BaseDirectory.Replace("bin\\Debug\\net472", "") + @"\MTM_Update.txt";

		public static string LogFileDirectory = AppDomain.CurrentDomain.BaseDirectory.Replace("bin\\Debug\\net472", "");

		public static TestRunnerLogger Log;

		public static string PowerShellScriptPathToGetBuildInformation = AppDomain.CurrentDomain.BaseDirectory.Replace("bin\\Debug\\net472", "") + @"\References\Get-Orion-Services-Versions.ps1";

        public static string InboundFolder = "837P_CORE";

        public static string BusinessLogicXaml = @"\\nile\QA_VSS\QDS\RELEASES\QC-QDS 2024.1000.0\Archive\08-22745-08\Artifacts\Workflows\dataServices\Deploy\Workflows\BusinessLogic\ProfessionalTestFlight.xaml";

        public static string OutboundFolder = "837P_CORE_SSIS";
    }
}
