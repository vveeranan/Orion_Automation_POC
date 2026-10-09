using Automation.Common;
using Automation.TestRunner;
using System;
using System.Collections.Generic;
using System.IO;

namespace TestDataGenerator
{
    public class SetupTemplate : QCTestSetup
	{
		private const string _testCaseId = "6296";
		private static TestCaseUtilities Common = new TestCaseUtilities();

		// Create any variables needed in the QC setup or unique uds needed in the test scenario
		// If these are not hard coded, they can be set in the SetupVariables method to use a unique naming convention
		#region Test Variables
		private string _tcPrefix;

		// Queue Variables
		private string _queueName;
		private string _queueDescription;
		private string _queueCriteriaName = "Claim Form Type";

		// Task Variables
		private string _taskTitle;
		private string _taskPriority = "Low";
		private string _taskStatus = "Resolved";
		private string _taskDescription;
		private string _taskView = "All";

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

		// Member Variables
		private string _memberLast;
		private string _memberFirst;
		private string _memberPID;
		private DateTime _memberDOB = new DateTime(1981, 12, 15);
		private string _enrollment;

		// Accounting Variables
		private string _accountingCompany;
		private string _bankAccount;
		private string _bankName;
		private string _vendor;
		private string _vendorTax;

		// Claim Variables
		private string _claimUD;
		private string _clmPaymentQueue;
		private string _clmDisburseQueue;
		private DateTime _claimDate = DateTime.Today.AddMonths(-3);

		private DateTime _fromDate = DateTime.Today.AddYears(-1);

		#endregion

		/// <summary>
		/// SetupVariables method sets up all the test variables with the established naming convention using the TC prefix.
		/// </summary>
		private void SetupVariables()
		{
			// Considering using  OT instead of TC to distinguish Orion Test Cases from other QC test cases
			_tcPrefix = Common.SetTcPrefix("TC" + _testCaseId, QAInitials, "COMP", Iteration, null);

			// Queue Variables
			_queueName = Common.UseCompValue(_tcPrefix, "QN");
			_queueDescription = $"{Common.UseCompValue(_tcPrefix, "QN")} Description";

			// Task Variables
			_taskTitle = Common.UseCompValue(_tcPrefix, "TT");
			_taskDescription = $"{Common.UseCompValue(_tcPrefix, "TT")} Description";

			// Benefit Variables
			_benefitCodeGroup = Common.UseCompValue(_tcPrefix, "BCG");
			_treatmentType = Common.UseCompValue(_tcPrefix, "TT");
			_treatmentTypeSet = Common.UseCompValue(_tcPrefix, "TTS");
			_benefitFramework = Common.UseCompValue(_tcPrefix, "BF");
			_benefit = Common.UseCompValue(_tcPrefix, "BEN");
			_benefitPlan = Common.UseCompValue(_tcPrefix, "BP");
			_benefitContract = Common.UseCompValue(_tcPrefix, "BC");
			_group = Common.UseCompValue(_tcPrefix, "GRP");
			_client = Common.UseCompValue(_tcPrefix, "CLNT");

			// Fee Schedule Variables
			_feeSchedule = Common.UseCompValue(_tcPrefix, "FS");
			_paymentContract = Common.UseCompValue(_tcPrefix, "PC");

			// Provider Variables
			_providerName = Common.UseCompValue(_tcPrefix, "PN");
			_providerNPI = Common.UseCompValue(_tcPrefix, "NPI");

			// Member Variables
			_memberLast = Common.UseCompValue(_tcPrefix, "ML");
			_memberFirst = Common.UseCompValue(_tcPrefix, "MF");
			_memberPID = Common.UseCompValue(_tcPrefix, "MPID");

			// Accounting Variables
			_accountingCompany = Common.UseCompValue(_tcPrefix, "AC");
			_bankAccount = $"{QAInitials}{_testCaseId}{Iteration}";
			_bankName = Common.UseCompValue(_tcPrefix, "BN");
			_vendor = Common.UseCompValue(_tcPrefix, "VEND");
			_vendorTax = Common.UseCompValue(_tcPrefix, "VT");

			// Claim Variables
			_claimUD = Common.UseCompValue(_tcPrefix, "CLM");
			_clmPaymentQueue = Common.UseCompValue(_tcPrefix, "CPQ");
			_clmDisburseQueue = Common.UseCompValue(_tcPrefix, "CDQ");
		}

		public SetupTemplate() : base()
		{
			Results = new TestResults();
		}

		public override string ToString()
		{
			return _testCaseId;
		}

		/// <summary>
		/// Run method contains all need moethods to create the QC setup and write test data for each test scenario.
		/// This method is called from the Hooks class to run the setup for each scenario.
		/// </summary>
		/// <returns></returns>
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
			/*LoggerContext.Log.Message($"Running test setup for {_testCaseId}.");

			// Set Test Variables
			SetupVariables();

			// This region is for any setup that is under the Enterprise Administration node in QC
			// It configuration that can be globally used and does not have a uniquie idenitifier using the TC prefix
			#region System Values Setup

			// Create/Check for Home Address Type
			var typeID = Controllers.QCController.SystemTableEditor.ReadAddressType("Home");
			if (typeID == 0)
			{
				typeID = Controllers.QCController.SystemTableEditor.CreateAddressType("Home", "Home");
			}
			LoggerContext.Log.Message($"Checked for or created Home address type: Home");

			// Create/Check for Ashland Postal Code
			var ashlandLocateID = Controllers.QCController.PostalCodes.ReadPostalCode("97520", "Ashland");
			if (ashlandLocateID == 0)
			{
				ashlandLocateID = Controllers.QCController.PostalCodes.CreatePostalCode("97520", "Ashland", "Jackson", "OR", "USA");
			}
			LoggerContext.Log.Message($"Checked for or created Ashland postal code: 97520");

			#endregion

			// This region is for any setup related to the Benefit Administration node in QC
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
			LoggerContext.Log.Message($"Created benefit procedure code group - {_benefitCodeGroup}.");

			// Treatment Type Set and Treatment Type
			var ttsID = Controllers.QCController.GlobalTreatmentTypes.ReadTreatmentTypeSet(_treatmentTypeSet);
			if (ttsID == 0)
			{
				ttsID = Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeSet(_treatmentTypeSet, $"{_treatmentTypeSet} Name", $"Treatment Type Set for {_testCaseId}");
				var ttID = Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentType(_treatmentType, $"{_treatmentType} Name", $"Treatment Type for {_testCaseId}");
				Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeProcedureCodeGroup(ttID, bpxcgID, _fromDate, null);
				Controllers.QCController.GlobalTreatmentTypes.CreateTreatmentTypeSetTreatmentType(ttsID, ttID);
			}
			LoggerContext.Log.Message($"Created treatment type set - {_treatmentTypeSet} and treatment type - {_treatmentType}.");

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
			LoggerContext.Log.Message($"Created benefit framework - {_benefitFramework} with covered benefit - {_benefit}.");
			LoggerContext.Log.Message($"Added - {_treatmentTypeSet} to benefit framework.");

			// Benefit Plan
			var bpID = Controllers.QCController.BenefitPlans.ReadBenefitPlan(_benefitPlan);
			if (bpID == 0)
			{
				bpID = Controllers.QCController.BenefitPlans.CreateBenefitPlan(_benefitPlan, bfID);
			}
			LoggerContext.Log.Message($"Created benefit plan - {_benefitPlan} with benefit framework - {_benefitFramework}.");

			// Client
			var clientID = Controllers.QCController.Clients.ReadClientName(_client);
			if (clientID == 0)
			{
				clientID = Controllers.QCController.Clients.CreateClient(_fromDate, null);
				Controllers.QCController.Clients.CreatClientName(clientID, _client, "Company", true);
			}
			LoggerContext.Log.Message($"Created client - {_client}.");

			// Group
			var groupID = Controllers.QCController.Groups.ReadGroupName(_group);
			if (groupID == 0)
			{
				groupID = Controllers.QCController.Groups.CreateGroup(clientID, _fromDate, null);
				Controllers.QCController.Groups.CreateGroupName(groupID, _group, "Company", true);
			}
			LoggerContext.Log.Message($"Created client group - {_group} for client - {_client}.");

			// Benefit Contract
			var bcID = Controllers.QCController.BenefitContracts.ReadBenefitContract(_benefitContract);
			if (bcID == 0)
			{
				bcID = Controllers.QCController.BenefitContracts.CreateBenefitContract(groupID, _benefitContract, _fromDate, null);
				var bcPeriodID = Controllers.QCController.BenefitContracts.CreateBenefitContractPeriod(bcID, _fromDate, null);
				var bcPeriodPlanID = Controllers.QCController.BenefitContracts.CreateBaseBenefitContractPeriodBenefitPlan(bcPeriodID, bpID);
				Controllers.QCController.BenefitContracts.CreateBenefitContractBenefitPlanCobRule(bcPeriodPlanID, "None", _fromDate, null);
			}
			LoggerContext.Log.Message($"Created benefit contract - {_benefitContract} with benefit plan - {_benefitPlan} for group - {_group}.");

			#endregion

			// This region is for any setup related to the Accounting Administration node in QC
			#region Accounting Setup

			// Add client accounting company
			var acID = Controllers.QCController.AccountingCompanies.ReadAccountingCompany(_accountingCompany);
			if (acID == 0)
			{
				acID = Controllers.QCController.AccountingCompanies.CreateAccountingCompany(_accountingCompany);
				var cashAcctID = Controllers.QCController.AccountingCompanies.CreateAccountingCompanyAccount("1001", acID, "Debit", "Cash");
				var apAcctID = Controllers.QCController.AccountingCompanies.CreateAccountingCompanyAccount("2002", acID, "Credit", "Accounts Payable");
				var expenseAcctID = Controllers.QCController.AccountingCompanies.CreateAccountingCompanyAccount("3003", acID, "Debit", "Expense");
				var incomeAcctID = Controllers.QCController.AccountingCompanies.CreateAccountingCompanyAccount("4004", acID, "Credit", "Income");
				var arAcctID = Controllers.QCController.AccountingCompanies.CreateAccountingCompanyAccount("5005", acID, "Debit", "Accounts Receivable");
				var bankAcctID = Controllers.QCController.AccountingCompanies.CreateBankAccount(_bankAccount, _bankName, cashAcctID, acID, "1001 BANK ADDRESS", "", ashlandLocateID, "", "BNK ACCT NUMBER", 101, "0123456789", _fromDate, null);

				// !!!! Only need this setup if you plan to pay claims
				Controllers.QCController.AccountAssignments.CreateTAPClaimPaymentAssignment(clientID, apAcctID, expenseAcctID, _fromDate, null);
				Controllers.QCController.AccountAssignments.CreateDPClaimPaymentAssignment(clientID, acID, bankAcctID, _fromDate, null);
			}
			LoggerContext.Log.Message($"Created or checked for accounting company - {_accountingCompany}.");

			// !!! Only need this setup if you plan to pay claims
			LoggerContext.Log.Message($"Assigned client - {_client} to TAP and DP accounts from the accounting company.");

			Controllers.QCController.Clients.UpdateClientAccountingCompany(clientID, acID);
			LoggerContext.Log.Message($"Assigned accounting company - {_accountingCompany} to client - {_client}.");

			// Vendor
			var vendorID = Controllers.QCController.Vendors.ReadVendor(_vendor);
			if (vendorID == 0)
			{
				vendorID = Controllers.QCController.Vendors.CreateVendor(_vendor);
				Controllers.QCController.Vendors.UpdateVendorTaxID(vendorID, _vendorTax, "EIN", true);
				Controllers.QCController.Vendors.CreateVendorPaymentMethod(vendorID, "Check", _fromDate, null);
				Controllers.QCController.Vendors.CreateVendorPayTo(vendorID, "Vendor PayTo", null, "100 Vendor Ln", "Suite 101", ashlandLocateID);
			}
			LoggerContext.Log.Message($"Checked for or created provider - {_vendor}.");

			#endregion

			// This region is for any setup related to the Member Services node in QC
			#region Member Setup

			// Member and Eligibility
			var enrollmentID = Controllers.QCController.Enrollment.ReadFamilyEligibility(_enrollment);
			var eligibilityID = 0;
			var memberID = 0;
			if (enrollmentID == 0)
			{
				memberID = Controllers.QCController.Members.CreateMember(_memberLast, _memberFirst, _memberDOB);
				Controllers.QCController.Members.UpdateMemberGender(memberID, "Male");
				Controllers.QCController.Members.UpdateMemberMaritalStatus(memberID, "Single");
				Controllers.QCController.Members.CreateMemberPersonalIdentifier(memberID, _memberPID, "PID");
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

			// This region is for any setup related to the Provider Management node in QC
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

			// This region is for any setup related to the Fee Schedule Administration node in QC
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

			// This region is for any setup related to the Payment Contract Administration node in QC
			#region Payment Contract Setup

			// Create and assign Payment Contract, professional
			var pcID = Controllers.QCController.PaymentContracts.ReadPaymentContract(_paymentContract);
			if (pcID == 0)
			{
				pcID = Controllers.QCController.PaymentContracts.CreatePaymentContract(_paymentContract);
				var pcDefID = Controllers.QCController.PaymentContracts.CreatePaymentContractDefinition(pcID, "Professional");
				Controllers.QCController.PaymentContracts.CreatePaymentContractRankedFeeScheduleDefinition(pcDefID, 1, fsID, _fromDate, null);
				var contractDefID = Controllers.QCController.PaymentContractAssignments.CreatePaymentContractProviderAssignment(pcID, provIdentifierID, _fromDate, null);
				Controllers.QCController.PaymentContractAssignments.UpdatePaymentContractAssignmentVendor(contractDefID, vendorID);
			}
			LoggerContext.Log.Message($"Created or checked for payment contract  - {_paymentContract}.");
			LoggerContext.Log.Message($"Contract assigned to provider - {_providerNPI} and vendor - {_vendor}.");

			#endregion

			// This region is for any setup related to the Claims Administration node in QC
			#region Claim Setup

			// Professional Claim
			var claimID = Controllers.QCController.ClaimsCommon.ReadClaim(_claimUD);
			var procedureID = 0;
			if (claimID == 0)
			{
				var dxCodeID = Controllers.QCController.DiagnosisCodes.ReadDiagnosisCode("W20.0XXA", _claimDate);
				claimID = Controllers.QCController.ProfessionalClaims.CreateProfessionalClaim(_claimUD, eligibilityID, provIdentifierID, vendorID);
				Controllers.QCController.ProfessionalClaims.CreateProfessionalClaimDiagnosisCode(claimID, dxCodeID, 1);
				var pxCodeID = Controllers.QCController.ProcedureCodes.ReadProcedureCode("99201", "CPT", _claimDate);
				procedureID = Controllers.QCController.ProfessionalClaims.CreateProfessionalClaimProcedure(claimID, _claimDate, _claimDate, "11", "1", pxCodeID, 1, 300);
				Controllers.QCController.ProfessionalClaims.UpdateClaimProcedureNPIRenderingProvider(procedureID, provIdentifierID);
				Controllers.QCProcessingController.Adjudication.AdjudicateClaim(claimID, _claimUD);
			}
			else
			{
				procedureID = Controllers.QCController.ClaimsCommon.ReadClaimProcedure(claimID, 1m);
			}
			LoggerContext.Log.Message($"Created or checked for and adjudicated+ professional claim - {_claimUD}.");

			#endregion
			
			// !!! The claim payment and disbursement queues are only needed if you plan to run claims through the payment process
			#region Claim Queue Setup

			// Claim Payment Queue
			var cpqID = Controllers.QCController.ClaimPaymentQueues.ReadClaimPaymentQueue(_clmPaymentQueue);
			if (cpqID == 0)
			{
				cpqID = Controllers.QCController.ClaimPaymentQueues.CreateClaimPaymentQueue(_clmPaymentQueue);
				var cpqCriteriaID = Controllers.QCController.ClaimPaymentQueues.CreateClaimPaymentQueueCriteria(cpqID, _fromDate, null);
				Controllers.QCController.ClaimPaymentQueues.UpdateClaimPaymentQueueCriteriaVendor(cpqCriteriaID, vendorID);
				Controllers.QCController.ClaimPaymentQueues.UpdateClaimPaymentQueueCriteriaClient(cpqCriteriaID, clientID);
				Controllers.QCController.ClaimPaymentQueues.UpdateClaimPaymentQueueCriteriaGroup(cpqCriteriaID, groupID);
			}
			LoggerContext.Log.Message($"Checked for or created claim payment queue - {_clmPaymentQueue}.");
			LoggerContext.Log.Message($"Assigned vendor - {_vendor}, client - {_client}, and group - {_group} to payment queue criteria.");

			// Claim Disbursement Queue
			var dpCpqID = Controllers.QCController.ClaimDisbursementQueues.ReadDisbursementClaimPaymentQueue(_clmDisburseQueue);
			if (dpCpqID == 0)
			{
				dpCpqID = Controllers.QCController.ClaimDisbursementQueues.CreateDisbursementClaimPaymentQueue(_clmDisburseQueue);
				var dpCpqCriteriaID = Controllers.QCController.ClaimDisbursementQueues.CreateDisbursementClaimPaymentQueueCriteria(dpCpqID, _fromDate, null);
				Controllers.QCController.ClaimDisbursementQueues.UpdateDisbursementClaimPaymentQueueCriteriaVendor(dpCpqCriteriaID, vendorID);
				Controllers.QCController.ClaimDisbursementQueues.UpdateDisbursementClaimPaymentQueueCriteriaClient(dpCpqCriteriaID, clientID);
				Controllers.QCController.ClaimDisbursementQueues.UpdateDisbursementClaimPaymentQueueCriteriaGroup(dpCpqCriteriaID, groupID);
			}
			LoggerContext.Log.Message($"Checked for or created claim disbursement queue - {_clmDisburseQueue}.");
			LoggerContext.Log.Message($"Assigned vendor - {_vendor}, client - {_client}, and group - {_group} to disbursement queue criteria.");

			#endregion

			// !!!
			// The following examples are only needed if your test needs the specific processes

			// Running the following line will keep the claim status as 'Approved' and update the claim line process status as 'In Claim Payment'
			// This is the first step to paying claims as long as the claim line status is 'Approved' and has a non zero net payment amount
			// If the claim line is 'Approved' and has a zero dollar net payment amount,
			// the claim and claim line process status will be updated to'Closed'
			LoggerContext.Log.Message("Running Claim Payment Queue");
			Controllers.QCProcessingController.Accounting.ClaimPayment(cpqID);
			LoggerContext.Log.Message("Claims line in claim payment");

			// Running the following line will keep the claim status as 'Approved' and update the claim line process status as 'In Accounting'
			// This is the second step to paying claims as long as the claim payment queue schedule ran successfully
			LoggerContext.Log.Message("Running Claim Payment Transfer To Accounting");
			Controllers.QCProcessingController.Accounting.TAPClaimPayment(claimID);
			LoggerContext.Log.Message("Claim Payment Transferred To Accounting");

			// Running the following line will keep the claim status as 'Approved' and update the claim line process status as 'Paid'
			// This is the third step to paying claims as long as the claim payment transfer to accounting ran successfully
			LoggerContext.Log.Message("Claim Payment Disbursement");
			Controllers.QCProcessingController.Accounting.DPClaimPayment(dpCpqID);
			LoggerContext.Log.Message("Claim Payment Disbursed");

			// Running the following line will update the claim status as 'Closed' and keep the claim line process status as 'Paid'
			// This is the final step to paying claims as long as the claim payment disbursement ran successfully
			LoggerContext.Log.Message("Commiting Checks");
			Controllers.QCProcessingController.Accounting.CommitChecks(acID, DateTime.Now, 1);
			LoggerContext.Log.Message("Checks Committed");

			LoggerContext.Log.Message($"Test setup for {_testCaseId} completed.");*/
		}

		/// <summary>
		/// WriteTestData method creates a csv datasource file with the test data uds needed for the test case.
		/// </summary>
		public void WriteTestData()
		{
			LoggerContext.Log.Message($"Writing test setup data for {_testCaseId}.");

			// csv file creation
			var dataFile = $"{Environment.CurrentDirectory.Replace("bin\\Debug\\net472", "Features\\Data")}\\TC6296Data.csv";

			List<string> testData = new List<string>
			{
				"QueueName,QueueDescription,QueueCriteriaName,ClaimFormTypeValue,ClaimUd,TaskTitle,TaskPriority,TaskStatus,TaskDescription,TaskView",
				$"{_queueName},{_queueDescription},{_queueCriteriaName},Professional,{_claimUD},{_taskTitle},{_taskPriority},{_taskStatus},{_taskDescription},{_taskView}"
			};

			File.WriteAllLines(dataFile, testData);

			LoggerContext.Log.Message($"Created test setup data file: {dataFile}.");
		}
	}
}
