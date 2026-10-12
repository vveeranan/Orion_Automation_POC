using Automation.Common;
using Automation.QC.DataEntry.Setups;
using Automation.TestRunner;
using System;


namespace TestDataGenerator
{
	public abstract class QCTestSetup
	{
		public TestResults Results { get; set; }
		public Database QCDatabase;
		public string QAInitials;
		public string Iteration;
		public string TestPrefix;
		public string ServicesServer;
		public QuantumChoiceSetupController QCSetupController;

		public void AddTestInfo(TestInformation testInfo)
		{
			//TestInfo = testInfo;
			Iteration = testInfo.GetParameter("auDPIteration")?.Value;
			if (testInfo.GetParameter("auDPInitials")?.Value == null || testInfo.GetParameter("auDPInitials")?.Value == "")
			{
				QAInitials = "CORE";
			}
			else
			{
				QAInitials = testInfo.GetParameter("auDPInitials")?.Value;
			}

			TestPrefix = $"{testInfo.TestCaseIdentifier}{QAInitials}{Iteration}COMP";
			ServicesServer = testInfo.GetParameter("auServicesServer")?.Value;

			// Set Test setup controllers
			var QCDatabase = new Database
			{
				ServicesServer = testInfo.GetParameter("auServicesServer")?.Value,
				DatabaseServer = testInfo.GetParameter("auDBServer")?.Value,
				DatabaseName = testInfo.GetParameter("auDBName")?.Value,
				Version = testInfo.GetParameter("auDPBuildVersion")?.Value
			};

			Controllers.QCSetupController = QuantumChoiceSetupFactory.Create(QCDatabase.ToString(), TestPrefix);
		}

		public abstract TestResults Run();
	}
}
