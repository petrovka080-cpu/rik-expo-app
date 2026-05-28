import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { isApprovedGreenCloseoutCurrentWavePatch as isApprovedSharedGreenCloseoutCurrentWavePatch } from "../greenCloseoutCurrentWaveAllowlist";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, "").replace(/\\/g, "/"));

const tryCatchGapsBatchAFiles = [
  "src/screens/accountant/accountant.actions.ts",
  "src/screens/contractor/hooks/useContractorScreenData.ts",
  "src/screens/foreman/foreman.dicts.repo.ts",
];

const isCurrentTryCatchGapsBatchA = (changed: string[]) =>
  tryCatchGapsBatchAFiles.every((expectedFile) =>
    changed.includes(expectedFile),
  );

const isApprovedTryCatchGapsBatchAPatch = (file: string) =>
  file === "src/screens/warehouse/warehouse.reports.ts";

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
    "src/screens/warehouse/warehouse.api.repo.ts",
    "src/screens/warehouse/warehouse.stockReports.service.ts",
  ].includes(file);

const isApprovedAiActionLedgerMigrationProposal = (file: string) =>
  [
    "supabase/migrations/20260512120000_ai_action_ledger.sql",
    "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql",
    "supabase/migrations/20260513230000_ai_action_ledger_apply.sql",
    "supabase/migrations/20260513234500_ai_action_ledger_forward_fix.sql",
    "supabase/migrations/20260513235900_ai_action_ledger_drop_obsolete_stub_overloads.sql",
    "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql -> artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
  ].includes(file);

const isApprovedAiTraceObservabilityPatch = (file: string) =>
  [
    "src/features/ai/observability/aiTraceTypes.ts",
    "src/features/ai/observability/aiTraceRecorder.ts",
    "src/features/ai/observability/aiTraceRedaction.ts",
    "src/features/ai/observability/aiTraceExportPolicy.ts",
    "tests/ai/aiTraceRecorder.contract.test.ts",
    "tests/ai/aiTraceRedaction.contract.test.ts",
    "tests/ai/aiTraceNoSecrets.contract.test.ts",
    "tests/architecture/aiTraceObservabilityArchitecture.contract.test.ts",
    "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_inventory.json",
    "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_matrix.json",
    "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_proof.md",
  ].includes(file);

const isApprovedAiDirectorCommandOfficeSecurityMagicPatch = (file: string) =>
  file === "tests/ai/aiDirectorReportsMagic.contract.test.ts";

const isLaterApprovedRpcValidationPatch = (file: string) =>
  ["src/lib/api/integrity.guards.ts"].includes(file);

const isApprovedPdfInstantFirstOpenPatch = (file: string) =>
  [
    "app/_layout.tsx",
    "app/pdf-viewer.tsx",
    "scripts/pdf/pdfOpenPerfProbe.ts",
    "src/lib/documents/pdfDocumentActionPlan.test.ts",
    "src/lib/documents/pdfDocumentActions.test.ts",
    "src/lib/documents/pdfDocumentActions.ts",
    "src/lib/documents/pdfDocumentPreviewAction.test.ts",
    "src/lib/documents/pdfDocumentPreviewAction.ts",
    "src/lib/documents/pdfDocumentPreviewSessionPlan.test.ts",
    "src/lib/documents/pdfDocumentPreviewSessionPlan.ts",
    "src/lib/documents/pdfDocumentSessions.test.ts",
    "src/lib/documents/pdfDocumentSessions.ts",
    "src/lib/documents/pdfDocumentVisibilityBusyPlan.test.ts",
    "src/lib/pdf/pdfInstantCache.ts",
    "src/lib/pdf/pdfViewer.handoffPlan.ts",
    "src/lib/pdf/pdfViewer.readiness.ts",
    "src/lib/pdf/pdfViewerBootstrapPlan.test.ts",
    "src/lib/pdf/pdfViewerBootstrapPlan.ts",
    "src/lib/pdf/pdfViewerContract.test.ts",
    "src/lib/pdf/pdfViewerContract.ts",
    "src/screens/accountant/AccountantScreen.tsx",
    "src/screens/accountant/accountant.screen.boundaries.test.ts",
    "tests/pdf/pdfDocumentActionsDecompositionAudit.test.ts",
    "tests/pdf/pdfOpenLatencyAudit.test.ts",
    "tests/pdf/pdfViewer.handoffPlan.test.ts",
    "tests/pdf/pdfViewer.readiness.test.ts",
    "tests/perf/performance-budget.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
    "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
  ].includes(file);

const isApprovedScaleBoundedDatabaseQueriesPatch = (file: string) =>
  [
    "src/lib/api/pdf_proposal.ts",
    "src/lib/pdf/pdf.builder.ts",
    "src/screens/contractor/contractor.pdfService.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedSScale03TimerRealtimeLifecyclePatch = (file: string) =>
  [
    "src/lib/api/pdf.ts",
    "src/lib/documents/pdfDocumentViewerEntry.ts",
    "src/lib/pdf/pdfViewer.helpers.ts",
    "src/screens/director/director.pdf.dmodal.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedDirectSupabaseBypassBatch1Patch = (file: string) =>
  [
    "src/lib/api/directorPdfSource.service.test.ts",
    "src/lib/api/directorPdfSource.service.ts",
    "src/lib/api/directorPdfSource.transport.ts",
    "scripts/server/stagingBffWarehouseApiReadPort.ts",
    "src/screens/warehouse/warehouse.api.bff.contract.ts",
    "src/screens/warehouse/warehouse.api.repo.ts",
    "src/screens/warehouse/warehouse.api.repo.transport.ts",
    "src/screens/warehouse/warehouse.incoming.repo.ts",
    "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    "src/screens/warehouse/warehouse.reports.repo.ts",
    "tests/api/warehouseApiBffRouting.contract.test.ts",
    "tests/scale/warehouseApiBffReadonlyDbPort.test.ts",
  ].includes(file);

const isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/api/canonicalPdfAuth.transport.ts",
    "src/lib/api/canonicalPdfBackendInvoker.ts",
  ].includes(file);

const isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/pdfRunner.ts",
    "src/lib/pdfRunner.auth.transport.ts",
    "src/lib/lifecycle/lifecycle.s3.test.ts",
    "tests/api/pdfRunnerAuthTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/api/directorPdfBackendInvoker.ts",
    "src/lib/api/directorPdfBackendInvoker.test.ts",
    "tests/api/directorPdfBackendAuthTransport.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle86StorageTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/storage.ts",
    "src/lib/api/storage.service.test.ts",
    "src/lib/api/storage.transport.ts",
  ].includes(file);

const isApprovedAuditBattle101AiReportsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/ai_reports.ts",
    "src/lib/ai_reports.transport.ts",
    "tests/api/aiReportsTransportBoundary.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle104DirectorReportsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/directorReportsTransport.service.ts",
    "src/lib/api/directorReportsTransport.transport.ts",
    "tests/api/directorReportsAggregationContracts.contract.test.ts",
    "tests/api/directorReportsTransportBoundary.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle105PaymentPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/paymentPdf.service.ts",
    "src/lib/api/paymentPdf.transport.ts",
    "tests/api/paymentPdfTransportBoundary.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle106ProposalsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/proposals.ts",
    "src/lib/api/proposals.transport.ts",
    "tests/api/proposalsTransportBoundary.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle107IntegrityGuardsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/integrity.guards.ts",
    "src/lib/api/integrity.guards.transport.ts",
    "tests/api/integrityGuardsTransportBoundary.contract.test.ts",
  ].includes(file);

const isApprovedAuditBattle108ProfileStorageTransportBoundaryPatch = (file: string) =>
  ["src/screens/profile/profile.storage.transport.ts"].includes(file);

const isApprovedAuditBattle109AttachmentOpenerStorageTransportBoundaryPatch = (file: string) =>
  ["src/lib/documents/attachmentOpener.storage.transport.ts"].includes(file);

const isApprovedAuditBattle116WarehouseIncomingFormPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
    "src/screens/warehouse/warehouse.incomingForm.pdf.transport.ts",
    "tests/api/warehouseIncomingFormPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle117WarehouseDayMaterialsPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.transport.ts",
    "tests/api/warehouseDayMaterialsPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle118WarehouseIncomingMaterialsPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.transport.ts",
    "tests/api/warehouseIncomingMaterialsPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle119WarehouseObjectWorkPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.objectWorkReport.pdf.transport.ts",
    "tests/api/warehouseObjectWorkPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle120ContractorPdfSourceTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/contractor/contractorPdfSource.service.ts",
    "src/screens/contractor/contractorPdfSource.transport.ts",
    "tests/api/contractorPdfSourceTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file);

const isApprovedAuditBattle123BuyerRepoStorageTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/buyer/buyer.repo.ts",
    "src/screens/buyer/buyer.repo.storage.transport.ts",
    "tests/api/buyerRepoStorageTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle126SupplierFilesStorageTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/files.storage.transport.ts",
    "tests/api/supplierFilesStorageTransport.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiDraftReportToolPatch = (file: string) =>
  [
    "artifacts/S_AI_DRAFT_02_DRAFT_REPORT_TOOL_inventory.json",
    "artifacts/S_AI_DRAFT_02_DRAFT_REPORT_TOOL_matrix.json",
    "artifacts/S_AI_DRAFT_02_DRAFT_REPORT_TOOL_proof.md",
    "src/features/ai/tools/draftReportTool.ts",
    "tests/ai/draftReportNoFinalSubmit.contract.test.ts",
    "tests/ai/draftReportTool.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiGroundedButtonsQaPatch = (file: string) =>
  [
    "artifacts/S_AI_GROUNDED_BUTTONS_AND_FREE_TEXT_QA_pdf_trace.json",
    "tests/ai/aiPdfAggregatorRequiredForDocumentQuestions.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiFieldWorkCopilotPatch = (file: string) =>
  [
    "src/features/ai/field/aiForemanReportDraftEngine.ts",
    "tests/ai/aiForemanReportDraftEngine.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiConstructionKnowledgeCorePatch = (file: string) =>
  /^src\/lib\/ai\/constructionKnowledgeCore\//.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiConstruction/.test(file.replace(/\\/g, "/"));

const isApprovedAiForemanRealWorkdayPatch = (file: string) =>
  /^src\/lib\/ai\/foremanIntelligence\//.test(file.replace(/\\/g, "/")) ||
  /^src\/lib\/ai\/constructionDataGraph\//.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiForeman/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "scripts/ai/aiForemanRealWorkdayFunnelProof.ts" ||
  /^scripts\/e2e\/runAiForemanRealWorkdayFunnel/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "tests/perf/performance-budget.test.ts" ||
  [
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
    "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiBuyerRealSourcingPatch = (file: string) =>
  /^src\/lib\/ai\/buyerSourcing\//.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiBuyer/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "scripts/ai/aiBuyerRealSourcingFunnelProof.ts" ||
  /^scripts\/e2e\/runAiBuyerRealSourcingFunnel/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "tests/perf/performance-budget.test.ts" ||
  [
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
    "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiAccountantRealFinancePatch = (file: string) =>
  /^src\/lib\/ai\/accountantFinance\//.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiAccountant/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "scripts/ai/aiAccountantRealFinanceFunnelProof.ts" ||
  /^scripts\/e2e\/runAiAccountantRealFinanceFunnel/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "tests/perf/performance-budget.test.ts" ||
  [
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
    "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiSupplierContractorMarketplaceIntakePatch = (file: string) =>
  /^src\/lib\/ai\/marketplaceIntake\//.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiMarketplace/.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiSupplierContractorMarketplaceIntake/.test(file.replace(/\\/g, "/")) ||
  /^tests\/ai\/aiContractorMarketplace/.test(file.replace(/\\/g, "/")) ||
  /^tests\/architecture\/aiMarketplace/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "scripts/ai/aiSupplierContractorMarketplaceIntakeProof.ts" ||
  /^scripts\/e2e\/runAiSupplierContractorMarketplaceIntake/.test(file.replace(/\\/g, "/")) ||
  file.replace(/\\/g, "/") === "tests/perf/performance-budget.test.ts" ||
  [
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
    "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedPlatformDirectorFactContractPatch = (file: string) =>
  [
    "src/lib/api/director_reports.aggregation.contracts.ts",
    "scripts/release/runDirectorFactContractProof.ts",
    "scripts/release/releaseGuard.shared.ts",
    "scripts/release/run-release-guard.ts",
    "scripts/release/runReleaseVerifyWithStepTiming.ts",
    "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts",
    "tests/api/directorFactContract.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiLiveUiRealAnswersRecoveryPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    /^src\/lib\/ai\/liveUi\//.test(normalized) ||
    /^tests\/ai\/aiLive/.test(normalized) ||
    /^tests\/architecture\/aiLiveUi/.test(normalized) ||
    /^scripts\/e2e\/runAiLiveUiAllScreensRealAnswers/.test(normalized) ||
    /^artifacts\/S_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_RECOVERY_/.test(normalized) ||
    [
      "src/features/ai/AIAssistantScreen.tsx",
      "src/features/ai/useAIAssistantScreenDerivedState.ts",
      "src/features/ai/AIAssistantReadyProductPanels.tsx",
      "src/features/ai/assistant.types.ts",
      "src/features/ai/assistantPrompts.ts",
      "src/features/ai/context/aiScreenContext.ts",
      "src/features/ai/assistantUx/aiAssistantContextResolver.ts",
      "scripts/ai/aiLiveUiAllScreensRealAnswersProof.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/api/hotspotListPaginationBatch7.contract.test.ts",
      "tests/load/sLoadFix1Hotspots.contract.test.ts",
    ].includes(normalized)
  );
};

const isApprovedAiContractorRealAcceptanceDeliveryPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized === "src/lib/ai/contractorAcceptance.ts" ||
    /^tests\/ai\/aiContractor/.test(normalized) ||
    /^scripts\/e2e\/runAiContractorRealAcceptanceDeliveryFunnel/.test(normalized) ||
    /^artifacts\/S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_/.test(normalized) ||
    [
      "tests/perf/performance-budget.test.ts",
      "tests/load/sLoadFix1Hotspots.contract.test.ts",
      "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    ].includes(normalized)
  );
};

const isApprovedAiSecurityRuntimeGovernancePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized === "src/lib/ai/securityRuntime.ts" ||
    /^src\/lib\/ai\/liveUi\/liveAi(?:ActionRouter|RouteRegistry|AnswerGuard)\.ts$/.test(normalized) ||
    /^tests\/ai\/ai(?:Security|Runtime)/.test(normalized) ||
    /^tests\/architecture\/ai(?:Security|Runtime)/.test(normalized) ||
    /^scripts\/e2e\/runAiSecurityRuntimeGovernance/.test(normalized) ||
    /^artifacts\/S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_/.test(normalized) ||
    [
      "tests/perf/performance-budget.test.ts",
      "tests/load/sLoadFix1Hotspots.contract.test.ts",
      "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    ].includes(normalized)
  );
};

const isApprovedAiToolTransportBoundaryPatch = (file: string) =>
  [
    "src/features/ai/tools/transport/draftReport.transport.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditNightBattle131AndroidRuntimeLoopBoundaryPatch = (file: string) =>
  [
    "scripts/foreman_warehouse_pdf_android_runtime_verify.ts",
    "tests/scripts/foremanWarehouseAndroidRuntimeLoopBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedNightUi13DirectorReportsModalStyleBoundaryPatch = (file: string) =>
  [
    "artifacts/S_NIGHT_UI_13_DIRECTOR_REPORTS_MODAL_STYLE_BOUNDARY_matrix.json",
    "artifacts/S_NIGHT_UI_13_DIRECTOR_REPORTS_MODAL_STYLE_BOUNDARY_proof.md",
    "src/screens/director/DirectorReportsModal.tsx",
    "src/screens/director/DirectorReportsModal.styles.ts",
    "tests/director/directorReportsModalStyleBoundary.decomposition.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedDirectorReportsFlatListTuningPatch = (file: string) =>
  [
    "artifacts/S_50K_DIRECTOR_REPORTS_FLATLIST_TUNING_inventory.json",
    "artifacts/S_50K_DIRECTOR_REPORTS_FLATLIST_TUNING_matrix.json",
    "artifacts/S_50K_DIRECTOR_REPORTS_FLATLIST_TUNING_proof.md",
    "artifacts/S_50K_DIRECTOR_REPORTS_FLATLIST_TUNING_release_verify_report.json",
    "scripts/perf/flatListTuningRegression.ts",
    "src/screens/director/DirectorReportsModal.tsx",
    "tests/perf/directorReportsModalFlatListTuning.contract.test.ts",
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedPerfFlatListEnterpriseTuningPatch = (file: string) =>
  [
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_emulator.json",
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_inventory.json",
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_matrix.json",
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_proof.md",
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_release_verify_report.json",
    "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_web.json",
    "scripts/e2e/runFlatListPerformanceMaestro.ts",
    "scripts/e2e/runFlatListPerformanceWeb.ts",
    "scripts/performance/verifyFlatListTuning.ts",
    "src/features/chat/ChatScreen.tsx",
    "src/features/reports/ReportsDashboardScreen.tsx",
    "src/features/supplierShowcase/SupplierShowcaseScreen.tsx",
    "src/lib/performance/listPerformancePolicy.ts",
    "tests/architecture/noUnboundedScrollViewMaps.contract.test.ts",
    "tests/api/hotspotListPaginationBatch7.contract.test.ts",
    "tests/e2e/flatListPerformanceMaestro.contract.test.ts",
    "tests/e2e/flatListPerformanceWeb.contract.test.ts",
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
    "tests/performance/flatListTuning.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiUniversalRoleQaOrchestratorSourcePlannerPatch = (file: string) =>
  [
    "src/lib/ai/universalRoleQa/universalPdfRetriever.ts",
    "tests/ai/aiUniversalRoleQaPdfRetriever.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiEnterpriseArchitectureGuardrailsNoKostylPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/enterpriseGuardrails/") ||
    normalized.startsWith("scripts/ai/runAiEnterpriseArchitectureGuardrails.ts") ||
    normalized.startsWith("tests/ai/aiEnterprise") ||
    normalized.startsWith("tests/architecture/aiEnterprise") ||
    normalized.startsWith(
      "artifacts/S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL_",
    )
  );
};

const isApprovedAiVerifiedExternalKnowledgeEnginePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/externalKnowledge/") ||
    normalized.startsWith("scripts/e2e/runAiVerifiedExternalKnowledge") ||
    normalized.startsWith("tests/ai/aiExternal") ||
    normalized.startsWith("tests/ai/aiVerifiedExternalKnowledge") ||
    normalized.startsWith("tests/architecture/aiExternalKnowledge") ||
    normalized.startsWith("artifacts/S_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE_")
  );
};

const isApprovedAiRoleMixed150RealAnswersPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/evaluation/goldenBusinessDataset/") ||
    normalized.startsWith("scripts/e2e/runAiRoleMixed150RealAnswers") ||
    normalized.startsWith("tests/ai/aiRoleMixed150") ||
    normalized.startsWith("tests/architecture/aiRoleMixed150") ||
    normalized.startsWith("artifacts/S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE_")
  );
};

const isApprovedAiRoleBusinessCopilotsFullWorkflowsPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/roleBusinessCopilots/") ||
    normalized.startsWith("scripts/e2e/runAiRoleBusinessCopilotsWorkflow") ||
    normalized.startsWith("tests/ai/aiRoleBusinessCopilots") ||
    normalized.startsWith("tests/ai/aiRoleWorkflow") ||
    /^tests\/ai\/ai(?:DirectorDecisionWorkflow|ForemanCloseoutWorkflow|BuyerProcurementWorkflow|AccountantPaymentWorkflow|WarehouseMovementWorkflow|ContractorAcceptanceWorkflow|DocumentEvidenceWorkflow|MarketplaceProductDraftWorkflow|OfficeStuckWorkWorkflow|ClientProgressWorkflow)/.test(normalized) ||
    normalized.startsWith("tests/architecture/aiRoleBusinessCopilots") ||
    normalized.startsWith("artifacts/S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS_") ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedMediaPhotoVideoIntelligenceCorePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/media/") ||
    normalized.startsWith("scripts/e2e/runMediaPhotoVideoIntelligence") ||
    normalized.startsWith("tests/media/") ||
    normalized.startsWith("tests/architecture/media") ||
    normalized.startsWith("artifacts/S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_") ||
    normalized === "src/lib/ai/appContextGraph/aiSourceRef.ts" ||
    normalized === "src/lib/ai/appContextGraph/aiDeepLinkRegistry.ts" ||
    normalized === "src/lib/ai/liveScreenCopilot/aiLiveScreenAnswerPresenter.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedAiDocumentPdfEvidenceIntelligenceCorePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/documents/evidenceIntelligence/") ||
    normalized.startsWith("scripts/e2e/runAiDocumentPdfEvidenceIntelligence") ||
    normalized.startsWith("tests/documents/") ||
    normalized.startsWith("tests/architecture/document") ||
    normalized.startsWith("artifacts/S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE_") ||
    normalized === "src/lib/ai/appContextGraph/aiSourceRef.ts" ||
    normalized === "src/lib/ai/appContextGraph/aiDeepLinkRegistry.ts" ||
    normalized === "src/lib/ai/liveScreenCopilot/aiLiveScreenAnswerPresenter.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedAiDomainDataGatewayContextRetrievalArchitecturePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/domainDataGateway/") ||
    normalized.startsWith("scripts/e2e/runAiDomainDataGatewayContextRetrieval") ||
    normalized.startsWith("tests/ai/domainGateway/") ||
    normalized.startsWith("tests/architecture/aiDomainGateway") ||
    normalized.startsWith("artifacts/S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE_") ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedAiContractRuntimeInvariantProofCorePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/contractRuntime/") ||
    normalized.startsWith("scripts/ai/runAiEnterpriseContractRuntimeInvariantProof") ||
    normalized.startsWith("scripts/e2e/runAiContractRuntimeInvariant") ||
    normalized.startsWith("tests/ai/contractRuntime/") ||
    normalized.startsWith("tests/architecture/aiContractRuntime") ||
    normalized.startsWith("artifacts/S_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE_") ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedAiSafeActionDraftApprovalOrchestratorPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/safeActions/") ||
    normalized.startsWith("scripts/ai/runAiSafeActionDraftApprovalProof") ||
    normalized.startsWith("scripts/e2e/runAiSafeActionDraftApproval") ||
    normalized.startsWith("tests/ai/safeActions/") ||
    normalized.startsWith("tests/architecture/aiSafeActions") ||
    normalized.startsWith("artifacts/S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_") ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedAiHumanApprovalLedgerExecutionBoundaryPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/approvalExecutionBoundary/") ||
    normalized.startsWith("scripts/ai/runAiHumanApprovalLedgerExecutionBoundaryProof") ||
    normalized.startsWith("scripts/e2e/runAiHumanApprovalLedgerExecutionBoundary") ||
    normalized.startsWith("tests/ai/approvalExecution/") ||
    normalized.startsWith("tests/architecture/aiApproval") ||
    normalized.startsWith("artifacts/S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY_") ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts"
  );
};

const isApprovedGreenCloseoutCurrentWavePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    isApprovedSharedGreenCloseoutCurrentWavePatch(normalized) ||
    normalized.startsWith("scripts/e2e/runB2C") ||
    normalized.startsWith("src/features/consumerRepair/") ||
    normalized.startsWith("src/lib/consumerRequests/") ||
    normalized.startsWith("scripts/e2e/runAllScreens") ||
    normalized === "scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared.ts" ||
    normalized === "maestro/all-screens-enterprise-runtime.yaml" ||
    normalized.startsWith("tests/allScreensRuntime/") ||
    normalized.startsWith("tests/architecture/allScreens") ||
    normalized.startsWith("tests/consumerRepair/") ||
    normalized.startsWith("tests/architecture/consumerRepair") ||
    normalized === "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql" ||
    normalized === "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql" ||
    normalized === "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql" ||
    normalized === "src/components/layout/AppDetailSheet.tsx" ||
    normalized === "tests/ui/canonicalMobileLayout/AppDetailSheet.contract.test.ts"
  );
};

const isApprovedBuiltInAi50000Phase1Patch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/lib/ai/builtInAi50000/") ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
    normalized === "scripts/audit/runBuiltInAi50000Phase1NoHacksAudit.ts" ||
    normalized === "scripts/audit/runBuiltInAi50000Phase2NoHacksAudit.ts" ||
    normalized === "scripts/e2e/runBuiltInAi50000Phase1ShardProof.ts" ||
    normalized === "scripts/e2e/runBuiltInAi50000Phase1ShardMerge.ts" ||
    normalized === "scripts/e2e/runBuiltInAi50000Phase2ShardProof.ts" ||
    normalized === "scripts/e2e/runBuiltInAi50000Phase2ShardMerge.ts" ||
    normalized === "scripts/e2e/runAndroidAi50000Phase1LiveSampleSmoke.ts" ||
    normalized === "scripts/e2e/runAndroidAi50000Phase2RuntimeSampleSmoke.ts" ||
    normalized.startsWith("tests/builtInAi50000/") ||
    normalized.startsWith("tests/builtInAi50000Phase1/") ||
    normalized.startsWith("tests/architecture/ai50000Phase1") ||
    normalized.startsWith("tests/architecture/ai50000Phase2") ||
    normalized === "tests/e2e/ai50000Phase1LiveSample.web.spec.ts" ||
    normalized === "tests/e2e/ai50000Phase2RuntimeSample.web.spec.ts" ||
    normalized === ".github/workflows/ai-50000-phase2-sharded-proof.yml" ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts" ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_50000_PHASE1_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_50000_PHASE2_") ||
    normalized.startsWith("artifacts/pdf/built-in-ai-50000-phase2/") ||
    normalized.startsWith("artifacts/pdf/built-in-ai-50000-phase1/")
  );
};

const isApprovedRequestAiEstimateBoqCatalogPatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/features/consumerRepair/") ||
    normalized.startsWith("src/features/catalog/") ||
    normalized.startsWith("src/lib/catalog/") ||
    normalized.startsWith("src/lib/consumerRequests/") ||
    normalized.startsWith("src/lib/ai/globalEstimate/") ||
    normalized === "src/lib/catalog_api.ts" ||
    normalized === "scripts/audit/runRequestAiEstimateBoqCatalogAudit.ts" ||
    normalized === "scripts/e2e/runAndroidRequestEstimateBoqCatalogSmoke.ts" ||
    normalized === "scripts/e2e/runRequestAiEstimateBoqCatalogProof.ts" ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized.startsWith("tests/requestEstimate/") ||
    normalized.startsWith("tests/catalogItems/") ||
    normalized.startsWith("tests/catalogBinding/") ||
    normalized.startsWith("tests/architecture/androidAcceptance") ||
    normalized.startsWith("tests/architecture/androidEmulatorReplay") ||
    normalized.startsWith("tests/architecture/entrypointFix") ||
    normalized.startsWith("tests/architecture/requestEstimate") ||
    normalized.startsWith("tests/architecture/catalogBinding") ||
    normalized === "tests/e2e/requestEstimateProfessionalBoqCatalog.web.spec.ts" ||
    normalized === "tests/e2e/catalogItemsEstimateBinding.web.spec.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts" ||
    normalized.startsWith("artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_") ||
    normalized.startsWith("artifacts/screenshots/catalog-items-estimate-binding/") ||
    normalized.startsWith("artifacts/S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_") ||
    normalized.startsWith("artifacts/screenshots/request-estimate-boq-catalog/")
  );
};

const isApprovedRatebookCatalogSourceGovernancePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized === "src/lib/ai/globalEstimate/sourceGovernance" ||
    normalized.startsWith("src/lib/ai/globalEstimate/sourceGovernance/") ||
    normalized === "src/lib/ai/globalEstimate/index.ts" ||
    normalized === "src/lib/ai/globalEstimate/validateGlobalEstimateResult.ts" ||
    normalized === "src/lib/ai/globalEstimate/catalogBinding/validateEstimateCatalogBinding.ts" ||
    normalized === "src/lib/consumerRequests/consumerRequestPayloadParity.ts" ||
    normalized === "src/lib/consumerRequests/index.ts" ||
    normalized === "scripts/e2e/runAndroidSourceGovernanceSmoke.ts" ||
    normalized === "scripts/e2e/runSourceGovernanceProof.ts" ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/architecture/requestEstimateNoFakeCatalogItems.contract.test.ts" ||
    normalized === "tests/sourceGovernance" ||
    normalized.startsWith("tests/sourceGovernance/") ||
    normalized.startsWith("tests/architecture/sourceGovernance") ||
    normalized === "tests/e2e/sourceGovernanceEstimateCatalog.web.spec.ts" ||
    normalized.startsWith("artifacts/S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_") ||
    normalized.startsWith("artifacts/screenshots/source-governance/")
  );
};

describe("S-PAG-7 hotspot list read pagination", () => {
  it("bounds contractor and buyer child-list reads without clipping default callers", () => {
    const contractorData = read("src/screens/contractor/contractor.data.ts");
    expect(contractorData).toContain(
      "CONTRACTOR_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(contractorData).toContain("async function loadPagedContractorRows");
    expect(contractorData).toContain(
      "loadPagedRowsWithCeiling(queryFactory, CONTRACTOR_LIST_PAGE_DEFAULTS",
    );
    expect(contractorData).toContain('.from("requests")');
    expect(contractorData).toContain('.from("work_progress_log")');
    expect(contractorData).toContain('.from("work_progress_log_materials")');
    expect(contractorData).toContain('.from("v_wh_issue_req_items_ui")');

    const buyerRepo = read("src/screens/buyer/buyer.repo.ts");
    expect(buyerRepo).toContain(
      "BUYER_REPO_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(buyerRepo).toContain("async function loadPagedBuyerRepoRows");
    expect(buyerRepo).toContain(
      "loadPagedRowsWithCeiling(queryFactory, BUYER_REPO_LIST_PAGE_DEFAULTS",
    );
    expect(buyerRepo).toContain("repoGetProposalItemsForView(");
    expect(buyerRepo).toContain("repoGetProposalItemLinks(");
    expect(buyerRepo).toContain("repoGetRequestItemToRequestMap(");
    expect(buyerRepo).toContain("maxRows: 5000");
  });

  it("clamps the two S-LOAD-3 hotspot list rpc callers", () => {
    const buyerFetchers = read("src/screens/buyer/buyer.fetchers.ts");
    expect(buyerFetchers).toContain("BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100");
    expect(buyerFetchers).toContain("normalizeBuyerInboxLimit");
    expect(buyerFetchers).toContain("p_limit: normalizedLimitGroups");
    expect(buyerFetchers).toContain("runContainedRpc(");
    expect(buyerFetchers).toContain('"buyer_summary_inbox_scope_v1"');

    const warehouseCanonical = read(
      "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    );
    expect(warehouseCanonical).toContain(
      "WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 }",
    );
    expect(warehouseCanonical).toContain("normalizeWarehouseIssueQueuePage");
    expect(warehouseCanonical).toContain("normalizedPage.pageSize");
    expect(warehouseCanonical).toContain("fetchWarehouseIssueQueueScope(");
  });

  it("keeps skipped surfaces and hard exclusions untouched", () => {
    const contractorResolvers = read(
      "src/screens/contractor/contractor.resolvers.ts",
    );
    expect(contractorResolvers).toContain(".maybeSingle()");
    expect(contractorResolvers).not.toContain("loadPagedContractorRows");
    expect(contractorResolvers).not.toContain("normalizePage(");

    const changed = changedFiles();
    const tryCatchGapsBatchA = isCurrentTryCatchGapsBatchA(changed);
    const forbiddenChanged = changed.filter(
      (file) =>
        !(tryCatchGapsBatchA && isApprovedTryCatchGapsBatchAPatch(file)) &&
        !isLaterApprovedWarehouseIssueSourcePatch(file) &&
        !isApprovedAiActionLedgerMigrationProposal(file) &&
        !isApprovedAiTraceObservabilityPatch(file) &&
        !isLaterApprovedRpcValidationPatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
        !isApprovedScaleBoundedDatabaseQueriesPatch(file) &&
        !isApprovedSScale03TimerRealtimeLifecyclePatch(file) &&
        !isApprovedDirectSupabaseBypassBatch1Patch(file) &&
        !isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle86StorageTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle101AiReportsTransportBoundaryPatch(file) &&
        !isApprovedAiDirectorCommandOfficeSecurityMagicPatch(file) &&
        !isApprovedAuditBattle104DirectorReportsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle105PaymentPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle106ProposalsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle107IntegrityGuardsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle108ProfileStorageTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle109AttachmentOpenerStorageTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle116WarehouseIncomingFormPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle117WarehouseDayMaterialsPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle118WarehouseIncomingMaterialsPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle119WarehouseObjectWorkPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle120ContractorPdfSourceTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle123BuyerRepoStorageTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle126SupplierFilesStorageTransportBoundaryPatch(file) &&
        !isApprovedAiDraftReportToolPatch(file) &&
        !isApprovedAiGroundedButtonsQaPatch(file) &&
        !isApprovedAiFieldWorkCopilotPatch(file) &&
        !isApprovedAiConstructionKnowledgeCorePatch(file) &&
        !isApprovedAiForemanRealWorkdayPatch(file) &&
        !isApprovedAiBuyerRealSourcingPatch(file) &&
        !isApprovedAiAccountantRealFinancePatch(file) &&
        !isApprovedAiSupplierContractorMarketplaceIntakePatch(file) &&
        !isApprovedAiLiveUiRealAnswersRecoveryPatch(file) &&
        !isApprovedAiContractorRealAcceptanceDeliveryPatch(file) &&
        !isApprovedAiSecurityRuntimeGovernancePatch(file) &&
        !isApprovedAiToolTransportBoundaryPatch(file) &&
        !isApprovedAuditNightBattle131AndroidRuntimeLoopBoundaryPatch(file) &&
        !isApprovedNightUi13DirectorReportsModalStyleBoundaryPatch(file) &&
        !isApprovedDirectorReportsFlatListTuningPatch(file) &&
        !isApprovedPerfFlatListEnterpriseTuningPatch(file) &&
        !isApprovedAiUniversalRoleQaOrchestratorSourcePlannerPatch(file) &&
        !isApprovedAiEnterpriseArchitectureGuardrailsNoKostylPatch(file) &&
        !isApprovedAiVerifiedExternalKnowledgeEnginePatch(file) &&
        !isApprovedAiRoleMixed150RealAnswersPatch(file) &&
        !isApprovedAiRoleBusinessCopilotsFullWorkflowsPatch(file) &&
        !isApprovedMediaPhotoVideoIntelligenceCorePatch(file) &&
        !isApprovedAiDocumentPdfEvidenceIntelligenceCorePatch(file) &&
        !isApprovedAiDomainDataGatewayContextRetrievalArchitecturePatch(file) &&
        !isApprovedAiContractRuntimeInvariantProofCorePatch(file) &&
        !isApprovedAiSafeActionDraftApprovalOrchestratorPatch(file) &&
        !isApprovedAiHumanApprovalLedgerExecutionBoundaryPatch(file) &&
        !isApprovedGreenCloseoutCurrentWavePatch(file) &&
        !isApprovedBuiltInAi50000Phase1Patch(file) &&
        !isApprovedRequestAiEstimateBoqCatalogPatch(file) &&
        !isApprovedRatebookCatalogSourceGovernancePatch(file) &&
        !isApprovedPlatformDirectorFactContractPatch(file) &&
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|android\/|ios\/|supabase\/migrations\/|maestro\/)/.test(
          file,
        ) ||
          /(?:pdf|report|export|integrity\.guards|warehouse\.api\.repo|storage)/i.test(
            file,
          )),
    );
    expect(forbiddenChanged).toEqual([]);
  });

  it("records the hotspot proof artifact with baseline, post count, and safety flags", () => {
    const matrix = JSON.parse(
      read("artifacts/S_PAG_7_hotspot_list_pagination_matrix.json"),
    );
    expect(matrix.wave).toBe("S-PAG-7");
    expect(matrix.baseline).toMatchObject({
      unboundedSelects: 95,
      unboundedFiles: 37,
    });
    expect(matrix.result).toMatchObject({
      unboundedSelects: 86,
      unboundedFiles: 37,
      fixedCallSites: 10,
      targetMet: true,
    });
    expect(matrix.skippedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/screens/contractor/contractor.resolvers.ts",
          reason: expect.stringContaining("single-row"),
        }),
      ]),
    );
    expect(matrix.safety).toMatchObject({
      productionTouched: false,
      stagingTouched: false,
      writes: false,
      sqlRpcRlsStorageChanged: false,
      businessLogicChanged: false,
      otaEasPlayMarketTouched: false,
    });
  });
});
