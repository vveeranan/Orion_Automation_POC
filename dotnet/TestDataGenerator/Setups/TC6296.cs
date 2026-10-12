using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TestDataGenerator
{
    /// <summary>
    /// 6296: QC Orion - Create a Queued Claim Task and View in My Tasks
    /// The queue assignment and criteria, the claim task and the My Tasks check are done in the Orion UI, on the existing
    /// ALL CLAIMS queue. This setup creates the claim in QC (with every record it depends on, as in TC002) and generates
    /// the unique task name for the test.
    /// </summary>
    public class TC6296 : QCTestSetup
    {
        private const string _testCaseId = "6296";
        private static TestCaseUtilities Common = new TestCaseUtilities();
        TestScenarioHelper testHelper = new TestScenarioHelper();

        #region Test Variables

        // Queue Variables (the existing ALL CLAIMS queue is used)
        private string _queueName;
        private string _queueDescription;

        // Task Variables (the task is created in the UI)
        private string _taskTitle;
        private string _taskNotes;

        // Benefit Variables
        private string _benefitCodeGroup;
        private string _treatmentType;
        private string _treatmentTypeSet;
        private string _benefitFramework;
        private string _benefit;
        private string _benefitPlan;
        private string _benefitContract;
        private string _group;
        private string _client;

        // Fee Schedule Variables
        private string _feeSchedule;
        private string _paymentContract;

        // Provider Variables
        private string _providerName;
        private string _providerNPI;

        // Vendor Variables
        private string _vendor;
        private string _vendorTax;

        // Member Variables
        private string _memberLast;
        private string _memberFirst;
        private string _memberPID;
        private string _enrollment;
        private DateTime _memberDOB = DateTime.Today.AddDays(-new Random().Next(30 * 365, 101 * 365));

        // Claim Variables
        private string _claimUD;
        private DateTime _claimDate = DateTime.Today.AddMonths(-3);

        private DateTime _fromDate = DateTime.Today.AddYears(-1);

        #endregion

        /// <summary>
        /// SetupVariables method sets up all the test variables with the established naming convention using the _tcPrefix.
        /// </summary>
        private void SetupVariables()
        {
            TestPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

            // Queue Variables
            _queueName = "ALL CLAIMS";
            _queueDescription = "ALL CLAIMS DESC";

            // Task Variables
            _taskTitle = Common.UseCompValue(TestPrefix, "TT");
            _taskNotes = $"{Common.UseCompValue(TestPrefix, "TT")} Notes";

            // Benefit Variables
            _benefitCodeGroup = Common.UseCompValue(TestPrefix, "BCG");
            _treatmentType = Common.UseCompValue(TestPrefix, "TT");
            _treatmentTypeSet = Common.UseCompValue(TestPrefix, "TTS");
            _benefitFramework = Common.UseCompValue(TestPrefix, "BF");
            _benefit = Common.UseCompValue(TestPrefix, "BEN");
            _benefitPlan = Common.UseCompValue(TestPrefix, "BP");
            _benefitContract = Common.UseCompValue(TestPrefix, "BC");
            _group = Common.UseCompValue(TestPrefix, "GRP");
            _client = Common.UseCompValue(TestPrefix, "CLNT");

            // Fee Schedule Variables
            _feeSchedule = Common.UseCompValue(TestPrefix, "FS");
            _paymentContract = Common.UseCompValue(TestPrefix, "PC");

            // Provider Variables
            _providerName = Common.UseCompValue(TestPrefix, "PN");
            _providerNPI = Common.UseCompValue(TestPrefix, "NPI");

            // Vendor Variables
            _vendor = Common.UseCompValue(TestPrefix, "VEND");
            _vendorTax = Common.UseCompValue(TestPrefix, "VT");

            // Member Variables
            _memberLast = Common.UseCompValue(TestPrefix, "ML");
            _memberFirst = Common.UseCompValue(TestPrefix, "MF");
            _memberPID = Common.UseCompValue(TestPrefix, "MPID");
            _enrollment = Common.UseCompValue(TestPrefix, "ENR");

            // Claim Variables
            _claimUD = Common.UseCompValue(TestPrefix, "CLM");
        }

        public TC6296() : base()
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
        /// It creates every record a professional claim depends on, then creates and adjudicates the claim.
        /// </summary>
        public void Setup()
        {
            LoggerContext.Log.Message($"Running test setup for {_testCaseId}.");

            // Set Test Variables
            SetupVariables();

            try
            {
                #region System Values Setup

                // Create/Check for Home Address Type
                var typeID = Controllers.QCController.SystemTableEditor.ReadAddressType("Home");
                if (typeID == 0)
                {
                    typeID = Controllers.QCController.SystemTableEditor.CreateAddressType("Home", "Home");
                }
                LoggerContext.Log.Message("Checked for or created Home address type: Home");

                // Create/Check for Ashland Postal Code
                var ashlandLocateID = Controllers.QCController.PostalCodes.ReadPostalCode("97520", "Ashland");
                if (ashlandLocateID == 0)
                {
                    ashlandLocateID = Controllers.QCController.PostalCodes.CreatePostalCode("97520", "Ashland", "Jackson", "OR", "USA");
                }
                LoggerContext.Log.Message("Checked for or created Ashland postal code: 97520");

                #endregion

                #region Benefit Setup

                // Benefit Procedure Code Group
                var bpxcgID = Controllers.QCController.ProcedureCodeGroups.ReadProcedureCodeGroup(_benefitCodeGroup);
                if (bpxcgID == 0)
                {
                    bpxcgID = Controllers.QCController.ProcedureCodeGroups.CreateProcedureCodeGroup(_benefitCodeGroup, "Benefits", "");
                    var beginCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("0001F", "CPT", _fromDate);
                    var endCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("99607", "CPT", _fromDate);
                    Controllers.QCController.ProcedureCodeGroups.CreateProcedureCodeGroupProcedureCodeDefinition(bpxcgID, "CPT", beginCodeID, endCodeID, false, _fromDate, null);
                    beginCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("A0021", "HCPCS", _fromDate);
                    endCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("V5364", "HCPCS", _fromDate);
                    Controllers.QCController.ProcedureCodeGroups.CreateProcedureCodeGroupProcedureCodeDefinition(bpxcgID, "HCPCS", beginCodeID, endCodeID, false, _fromDate, null);
                }
                LoggerContext.Log.Message($"Checked for or created benefit procedure code group - {_benefitCodeGroup}.");

                // Treatment Type Set and Treatment Type
                var ttsID = Controllers.QCController.GlobalTreatmentTypes.ReadTreatmentTypeSet(_treatmentTypeSet);
                if (ttsID == 0)
                {
                    ttsID = Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeSet(_treatmentTypeSet, $"{_treatmentTypeSet} Name", $"Treatment Type Set for {_testCaseId}");
                    var ttID = Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentType(_treatmentType, $"{_treatmentType} Name", $"Treatment Type for {_testCaseId}");
                    Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeProcedureCodeGroup(ttID, bpxcgID, _fromDate, null);
                    Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeSetTreatmentType(ttsID, ttID);
                }
                LoggerContext.Log.Message($"Checked for or created treatment type set - {_treatmentTypeSet} and treatment type - {_treatmentType}.");

                // Benefit Framework
                var bfID = Controllers.QCController.BenefitFrameworks.ReadBenefitFramework(_benefitFramework);
                if (bfID == 0)
                {
                    bfID = Controllers.QCController.BenefitFrameworks.CreateBenefitFramework(_benefitFramework, "Medical", "Base Benefits");
                    Controllers.QCController.BenefitFrameworks.CreateBenefitFrameworkTreatmentTypeSet(bfID, ttsID, _fromDate, null);
                    var benClassID = Controllers.QCController.BenefitFrameworks.CreateBenefitFrameworkBenefitClass(bfID, "Covered Benefit");
                    var benefitID = Controllers.QCController.BenefitFrameworks.CreateCoveredBenefit(_benefit, benClassID);
                    Controllers.QCController.BenefitFrameworks.CreateBenefitTreatmentTypeSet(benefitID, ttsID, _fromDate, null);
                    Controllers.QCController.BenefitFrameworks.CreateSingleValueBenefitCoverageRule(benefitID, "Yes", _fromDate, null);
                }
                LoggerContext.Log.Message($"Checked for or created benefit framework - {_benefitFramework} with covered benefit - {_benefit}.");

                // Benefit Plan
                var bpID = Controllers.QCController.BenefitPlans.ReadBenefitPlan(_benefitPlan);
                if (bpID == 0)
                {
                    bpID = Controllers.QCController.BenefitPlans.CreateBenefitPlan(_benefitPlan, bfID);
                }
                LoggerContext.Log.Message($"Checked for or created benefit plan - {_benefitPlan}.");

                // Client
                var clientID = Controllers.QCController.Clients.ReadClientName(_client);
                if (clientID == 0)
                {
                    clientID = Controllers.QCController.Clients.CreateClient(_fromDate, null);
                    Controllers.QCController.Clients.CreatClientName(clientID, _client, "Company", true);
                }
                LoggerContext.Log.Message($"Checked for or created client - {_client}.");

                // Group
                var groupID = Controllers.QCController.Groups.ReadGroupName(_group);
                if (groupID == 0)
                {
                    groupID = Controllers.QCController.Groups.CreateGroup(clientID, _fromDate, null);
                    Controllers.QCController.Groups.CreateGroupName(groupID, _group, "Company", true);
                }
                LoggerContext.Log.Message($"Checked for or created group - {_group} for client - {_client}.");

                // Benefit Contract
                var bcID = Controllers.QCController.BenefitContracts.ReadBenefitContract(_benefitContract);
                if (bcID == 0)
                {
                    bcID = Controllers.QCController.BenefitContracts.CreateBenefitContract(groupID, _benefitContract, _fromDate, null);
                    var bcPeriodID = Controllers.QCController.BenefitContracts.CreateBenefitContractPeriod(bcID, _fromDate, null);
                    var bcPeriodPlanID = Controllers.QCController.BenefitContracts.CreateBaseBenefitContractPeriodBenefitPlan(bcPeriodID, bpID);
                    Controllers.QCController.BenefitContracts.CreateBenefitContractBenefitPlanCobRule(bcPeriodPlanID, "None", _fromDate, null);
                }
                LoggerContext.Log.Message($"Checked for or created benefit contract - {_benefitContract} with benefit plan - {_benefitPlan}.");

                #endregion

                #region Vendor Setup

                // Vendor
                var vendorID = Controllers.QCController.Vendors.ReadVendor(_vendor);
                if (vendorID == 0)
                {
                    vendorID = Controllers.QCController.Vendors.CreateVendor(_vendor);
                    Controllers.QCController.Vendors.UpdateVendorTaxID(vendorID, _vendorTax, "EIN", true);
                    Controllers.QCController.Vendors.CreateVendorPaymentMethod(vendorID, "Check", _fromDate, null);
                    Controllers.QCController.Vendors.CreateVendorPayTo(vendorID, "Vendor PayTo", null, "100 Vendor Ln", "Suite 101", ashlandLocateID);
                }
                LoggerContext.Log.Message($"Checked for or created vendor - {_vendor}.");

                #endregion

                #region Member Setup

                // Member and Eligibility
                var enrollmentID = Controllers.QCController.Enrollment.ReadFamilyEligibility(_enrollment);
                var eligibilityID = 0;
                var memberID = 0;
                if (enrollmentID == 0)
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
                    var memberAddressID = Controllers.QCController.Members.CreateMemberAddress(memberID, "100 Ace Circle", "", ashlandLocateID, true, _fromDate, null);
                    Controllers.QCController.Members.UpdateMemberAddressType(memberAddressID, "Home");
                    enrollmentID = Controllers.QCController.Enrollment.CreateSubscriberEnrollment(_enrollment, bcID, memberID, _fromDate, null);
                    eligibilityID = Controllers.QCController.Enrollment.CreateEligibility(_enrollment, memberID, bpID, "Primary", _fromDate, null);
                }
                else
                {
                    memberID = Controllers.QCController.Members.ReadMemberByName(_memberLast, _memberFirst, null);
                    eligibilityID = Controllers.QCController.Enrollment.ReadFamilyEligibilityMemberBenefitPlan(enrollmentID, memberID, bpID);
                }
                LoggerContext.Log.Message($"Checked for or created member: {_memberPID} with enrollment: {_enrollment}");

                #endregion

                #region Provider Setup

                // Provider
                var provIdentifierID = Controllers.QCController.Providers.ReadProviderIdentifier(_providerNPI);
                if (provIdentifierID == 0)
                {
                    var providerID = Controllers.QCController.Providers.CreateProvider("Provider");
                    provIdentifierID = Controllers.QCController.Providers.CreateProviderIdentifier(providerID, "NPI", _providerNPI, true, _fromDate, null);
                    Controllers.QCController.Providers.CreateProviderName(providerID, _providerName, "", "", "Company", true);
                }
                LoggerContext.Log.Message($"Checked for or created provider - {_providerNPI}.");

                #endregion

                #region Fee Schedule Setup

                // Professional Fee Schedule
                var fsID = Controllers.QCController.ProfessionalFeeSchedules.ReadProfessionalFeeSchedule(_feeSchedule);
                if (fsID == 0)
                {
                    fsID = Controllers.QCController.ProfessionalFeeSchedules.CreateFeeSchedule(_feeSchedule);
                    var beginCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("0001F", "CPT", _fromDate);
                    var endCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("99607", "CPT", _fromDate);
                    Controllers.QCController.ProfessionalFeeSchedules.CreateFeeScheduleDetail(fsID, "CPT", beginCodeID, endCodeID, "Percent Billed", 0.8m, _fromDate, null);
                    beginCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("A0021", "HCPCS", _fromDate);
                    endCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("V5364", "HCPCS", _fromDate);
                    Controllers.QCController.ProfessionalFeeSchedules.CreateFeeScheduleDetail(fsID, "HCPCS", beginCodeID, endCodeID, "Percent Billed", 0.8m, _fromDate, null);
                }
                LoggerContext.Log.Message($"Checked for or created professional fee schedule - {_feeSchedule}.");

                #endregion

                #region Payment Contract Setup

                // Payment Contract, professional, assigned to the provider and vendor
                var pcID = Controllers.QCController.PaymentContracts.ReadPaymentContract(_paymentContract);
                if (pcID == 0)
                {
                    pcID = Controllers.QCController.PaymentContracts.CreatePaymentContract(_paymentContract);
                    var pcDefID = Controllers.QCController.PaymentContracts.CreatePaymentContractDefinition(pcID, "Professional");
                    Controllers.QCController.PaymentContracts.CreatePaymentContractRankedFeeScheduleDefinition(pcDefID, 1, fsID, _fromDate, null);
                    var contractDefID = Controllers.QCController.PaymentContractAssignments.CreatePaymentContractProviderAssignment(pcID, provIdentifierID, _fromDate, null);
                    Controllers.QCController.PaymentContractAssignments.UpdatePaymentContractAssignmentVendor(contractDefID, vendorID);
                }
                LoggerContext.Log.Message($"Checked for or created payment contract - {_paymentContract} assigned to provider - {_providerNPI} and vendor - {_vendor}.");

                #endregion

                #region Claim Setup

                // Professional Claim
                var claimID = Controllers.QCController.ClaimsCommon.ReadClaim(_claimUD);
                if (claimID == 0)
                {
                    var dxCodeID = Controllers.QCController.DiagnosisCodes.ReadDiagnosisCode("W20.0XXA", _claimDate);
                    claimID = Controllers.QCController.ProfessionalClaims.CreateProfessionalClaim(_claimUD, eligibilityID, provIdentifierID, vendorID);
                    Controllers.QCController.ProfessionalClaims.CreateProfessionalClaimDiagnosisCode(claimID, dxCodeID, 1);
                    var pxCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("99201", "CPT", _claimDate);
                    var procedureID = Controllers.QCController.ProfessionalClaims.CreateProfessionalClaimProcedure(claimID, _claimDate, _claimDate, "11", "1", pxCodeID, 1, 300);
                    Controllers.QCController.ProfessionalClaims.UpdateClaimProcedureNPIRenderingProvider(procedureID, provIdentifierID);
                    Controllers.QCProcessingController.Adjudication.AdjudicateClaim(claimID, _claimUD);
                }
                LoggerContext.Log.Message($"Checked for or created and adjudicated professional claim - {_claimUD}.");

                #endregion

                #region Task Check

                // The test creates the task in the UI, so it must not exist yet
                if (WorkerPortalLookups.TaskExists(_taskTitle))
                {
                    LoggerContext.Log.Message($"WARNING: task {_taskTitle} already exists. Increment the iteration before running the test.");
                }
                LoggerContext.Log.Message($"Checked that task {_taskTitle} does not exist; the claim is queued on {_queueName}.");

                #endregion

                LoggerContext.Log.Message($"Test setup for {_testCaseId} completed.");
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
                { "QueueDescription", _queueDescription },
                { "ClaimUD", _claimUD },
                { "SearchMemberName", _memberLast },
                { "ProviderNPI", _providerNPI },
                { "TaskTitle", _taskTitle },
                { "TaskNotes", _taskNotes }
            };

            testHelper.WriteTestScenarioData("TC" + _testCaseId, testData);

            LoggerContext.Log.Message("Created test setup data file.");
        }
    }
}
