using Automation.Orion.DataEntry.SQL.WorkerPortal;
using Automation.QC.DataEntry.Setups;
using Automation.QC.DataEntry.SQL.Core;
using Automation.QC.DataEntry.SQL.Hist;
using Automation.QC.Processing;
using Automation.QC.Validation.SQL;
using Automation.TPM.DataEntry.SQL;

namespace TestDataGenerator
{
	public static class Controllers
	{
        public static QuantumChoiceSQLController QCController { get; set; }
        public static QuantumChoiceProcessingController QCProcessingController { get; set; }
        public static QuantumChoiceSetupController QCSetupController { get; set; }
        public static QuantumChoiceSQLValidationController QCValidationController { get; set; }
        public static OrionWorkerPortalSQLController OrionWorkerPortalController { get; set; }
        public static QuantumChoiceSetupFactory QuantumChoiceSetupFactory { get; set; }
        public static TradingPartnerManagerSQLController TPMController { get; set; }
        public static HistorySQLController HistoryController { get; internal set; }

    }
}
