using Automation.Common;
using Automation.Logging;
using Automation.Orion.DataEntry.SQL.WorkerPortal;
using Automation.QC.DataEntry.Setups;
using Automation.QC.DataEntry.SQL.Core;
using Automation.QC.Processing;
using Automation.QC.Validation.SQL;
using Automation.TestRunner;
using Automation.TPM.DataEntry.SQL;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Reflection;
using TestDataGenerator;

partial class Program
{
    static void Main(string[] args)
    {
        if (args == null || args.Length == 0 || string.IsNullOrWhiteSpace(args[0]))
        {
            Console.WriteLine("Test case ID is required.");
            return;
        }

        string testCaseId = args[0];

        var generator = new Generator(testCaseId);
        generator.Run();
    }
}

public class Generator
{
    private readonly string testCaseId;

    public TestResults Results { get; set; }

    public Generator(string testCaseId)
    {
        this.testCaseId = testCaseId;
        Results = new TestResults();
    }

    public void Run()
    {
        #region Test Setup

        // ---------------------------------------------------------------------
        // Configuration
        // ---------------------------------------------------------------------

        var builder = new ConfigurationBuilder();
        var directory = AppDomain.CurrentDomain.BaseDirectory.Replace("bin\\Debug\\net472", "");
        builder.SetBasePath(directory).AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

        IConfiguration config = builder.Build();

        // ---------------------------------------------------------------------
        // Logging / Audit
        // ---------------------------------------------------------------------

        int? testCaseID = null;
        int sqlQAUserID = 0;
        int auditID = 0;

        Guid logJob = Guid.NewGuid();

        var logDatabase = new Database
        {
            DatabaseServer = config["LogServer"],
            DatabaseName = config["LogDatabase"]
        };

        var auditDatabase = new Database
        {
            DatabaseName = config["AuditDatabase"],
            DatabaseServer = config["AuditServer"]
        };

        var logFile = testCaseId + "_" + DateTime.Now.ToString("yyMMdd_HHmmssffff");

        Results.LogFilePath = LoggerContext.LogFileDirectory + logFile + ".log";

        Results.StartTime = DateTime.Now;
        Results.Identifier = testCaseId;

        var logInfo = new LogInformation
        {
            TestCaseID = testCaseId,
            TestType = "TestRunner"
        };

        LoggerContext.Log =
            (TestRunnerLogger)TestRunnerLoggingConfigurator.ConfigureLogging(
                Results,
                GetType(),
                logDatabase,
                logJob,
                logInfo);

        LoggerContext.Log.Message("Running test case " + testCaseId + " by user " + (logInfo.CallingUser ?? string.Empty).Replace("APPLEGATE\\", ""));

        // ---------------------------------------------------------------------
        // Test Information
        // ---------------------------------------------------------------------

        var testInformation = new TestInformation(TestCaseType.PlexisAssembly, testCaseId);
        testInformation.AddParameters(new List<TestParameter>
            {
                new TestParameter("auDPORIONBuildVersion", config["ORIONBuildVersion"]),
                new TestParameter("auDBORIONServer", config["ORIONServer"]),
                new TestParameter("auDBORIONName", config["WorkerPortalDatabase"]),
                new TestParameter("auServicesServer",config["ServiceServer"]),
                new TestParameter("auDBServer", config["CoreServer"]),
                new TestParameter("auDBName", config["CoreDatabase"]),
                new TestParameter("auHISTDBName", config["HistoryDatabase"]),
                new TestParameter("auDPInitials", config["Initials"]),
                new TestParameter("auDPIteration", config["Iteration"]),
                new TestParameter("logDBServer", config["LogServer"]),
                new TestParameter("logDBName", config["LogDatabase"]),
                new TestParameter("logFileDirectory", Results.LogFilePath),
                new TestParameter("auDBTPMServer", config["ORIONServer"]),
                new TestParameter("auDBTPMName", config["TPMDatabase"]),
                new TestParameter("auDPTPMBuildVersion", config["ORIONBuildVersion"]),
                new TestParameter("auTPMAgreement","837P_IMPORT"),
                //new TestParameter("auTPMAgreement","837P_EXPORT"),
				new TestParameter("inboundFolder", LoggerContext.InboundFolder),
                //new TestParameter("outboundFolder", LoggerContext.OutboundFolder),
                new TestParameter("businessLogicXaml", LoggerContext.BusinessLogicXaml),
                new TestParameter("ssisJobName", "837_EFL_ORION22")
            });

        LoggerContext.Log.Message(testInformation.ToString());

        // ---------------------------------------------------------------------
        // Create Audit Record
        // ---------------------------------------------------------------------

        using (var connection = new SqlConnection(auditDatabase.ToString()))
        {
            connection.Open();

            // Get QA user ID
            using (var cmd = new SqlCommand(
                "SELECT qa_user_id " +
                "FROM qa_user " +
                "WHERE sql_user_name = @user_name",
                connection))
            {
                cmd.Parameters.Add(
                    "@user_name",
                    SqlDbType.NVarChar,
                    50).Value = logInfo.CallingUser ?? string.Empty;

                var result = cmd.ExecuteScalar();

                if (result != null && result != DBNull.Value)
                {
                    sqlQAUserID = Convert.ToInt32(result);
                }
            }

            // Get test case ID
            using (var cmd = new SqlCommand(
                "SELECT test_case_id " +
                "FROM test_case " +
                "WHERE identifier = @test_case",
                connection))
            {
                cmd.Parameters.Add(
                    "@test_case",
                    SqlDbType.NVarChar).Value =
                    testCaseId.Replace("TC", "");

                var result = cmd.ExecuteScalar();

                if (result != null && result != DBNull.Value)
                {
                    testCaseID = Convert.ToInt32(result);
                }
            }

            // Create audit record only when QA user is valid
            if (sqlQAUserID != 0)
            {
                using (var cmd = new SqlCommand(
                    "plx_qa_user_test_case_audit_save",
                    connection))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(
                        "@qa_user_id",
                        SqlDbType.Int).Value = sqlQAUserID;

                    cmd.Parameters.Add(
                        "@test_case_id",
                        SqlDbType.Int).Value =
                        testCaseID.HasValue
                            ? (object)testCaseID.Value
                            : DBNull.Value;

                    cmd.Parameters.Add(
                        "@test_information",
                        SqlDbType.NVarChar,
                        4000).Value =
                        testInformation.ToString();

                    cmd.Parameters.Add(
                        "@log_job",
                        SqlDbType.UniqueIdentifier).Value = logJob;

                    cmd.Parameters.Add(
                        "@qa_user_test_case_audit_id_out",
                        SqlDbType.Int).Direction =
                        ParameterDirection.Output;

                    cmd.ExecuteNonQuery();

                    if (cmd.Parameters[
                            "@qa_user_test_case_audit_id_out"].Value !=
                        DBNull.Value)
                    {
                        auditID = Convert.ToInt32(
                            cmd.Parameters[
                                "@qa_user_test_case_audit_id_out"].Value);
                    }
                }
            }
            else
            {
                LoggerContext.Log.Error(
                    "Test case ID or QA User ID is not valid in Automation Manager");
            }
        }

        #endregion

        #region Controllers

        // ---------------------------------------------------------------------
        // Database Controllers
        // ---------------------------------------------------------------------

        var QCDatabase = new Automation.Common.Database
        {
            ServicesServer = testInformation.GetParameter("auServicesServer")?.Value,
            DatabaseServer = testInformation.GetParameter("auDBServer")?.Value,
            DatabaseName = testInformation.GetParameter("auDBName")?.Value,
            Version = testInformation.GetParameter("auDPBuildVersion")?.Value
        };

        var OrionDatabase = new Automation.Common.Database
        {
            ServicesServer = testInformation.GetParameter("auServicesServer")?.Value,
            DatabaseServer = testInformation.GetParameter("auDBORIONServer")?.Value,
            DatabaseName = testInformation.GetParameter("auDBORIONName")?.Value,
            Version = testInformation.GetParameter("auDPORIONBuildVersion")?.Value
        };

        var TPMDatabase = new Automation.Common.Database
        {
            ServicesServer = testInformation.GetParameter("auServicesServer")?.Value,
            DatabaseServer = testInformation.GetParameter("auDBTPMServer")?.Value,
            DatabaseName = testInformation.GetParameter("auDBTPMName")?.Value,
            Version = testInformation.GetParameter("auDPTPMBuildVersion")?.Value
        };

        var HistoryDatabase = new Automation.Common.Database
        {
            ServicesServer = testInformation.GetParameter("auServicesServer")?.Value,
            DatabaseServer = testInformation.GetParameter("auDBORIONServer")?.Value,
            DatabaseName = testInformation.GetParameter("auHISTDBName")?.Value,
            Version = testInformation.GetParameter("auDPORIONBuildVersion")?.Value
        };

        Controllers.QCController = new QuantumChoiceSQLController(QCDatabase.ToString());
        Controllers.QCProcessingController = new QuantumChoiceProcessingController(QCDatabase.ToString());
        Controllers.QCValidationController = new QuantumChoiceSQLValidationController(QCDatabase.ToString());
        Controllers.OrionWorkerPortalController = new OrionWorkerPortalSQLController(OrionDatabase.ToString());
        Controllers.QuantumChoiceSetupFactory = new QuantumChoiceSetupFactory(Controllers.QCController, testCaseId);
        Controllers.QCSetupController = new QuantumChoiceSetupController(Controllers.QuantumChoiceSetupFactory);
        Controllers.TPMController = new TradingPartnerManagerSQLController(TPMDatabase.ToString());
        //Controllers.HistoryController = new HistorySQLController(HistoryDatabase.ToString());

        #endregion

        #region Test Execution

        // ---------------------------------------------------------------------
        // Test Setup / Execution
        // ---------------------------------------------------------------------

        QCTestSetupFactory factory = new QCTestSetupFactory(Assembly.GetExecutingAssembly(), typeof(QCTestSetup));
        QCTestSetup setup = factory.GetTestSetup(testCaseId);
        setup.AddTestInfo(testInformation);
        setup.Run();

        #endregion
    }
}

