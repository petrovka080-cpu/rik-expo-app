import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(__dirname, "../..");

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const readJson = (relativePath: string) =>
  JSON.parse(readSource(relativePath)) as Record<string, unknown>;

const dirtyPaths = () => {
  const output = execFileSync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
};

const normalizePath = (file: string) => file.replace(/\\/g, "/");

const tryCatchGapsBatchAFiles = [
  "src/screens/accountant/accountant.actions.ts",
  "src/screens/contractor/hooks/useContractorScreenData.ts",
  "src/screens/foreman/foreman.dicts.repo.ts",
];

const isCurrentTryCatchGapsBatchA = (changed: string[]) =>
  tryCatchGapsBatchAFiles.every((expectedFile) =>
    changed.map(normalizePath).includes(expectedFile),
  );

const isApprovedTryCatchGapsBatchAPatch = (file: string) =>
  normalizePath(file) === "src/screens/warehouse/warehouse.reports.ts";

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
    "src/screens/warehouse/warehouse.stockReports.service.ts",
  ].includes(file.replace(/\\/g, "/"));

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
  ].includes(normalizePath(file));

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
  ].includes(normalizePath(file));

const isApprovedAiDirectorCommandOfficeSecurityMagicPatch = (file: string) =>
  normalizePath(file) === "tests/ai/aiDirectorReportsMagic.contract.test.ts";

const isApprovedAiGroundedButtonsQaPatch = (file: string) =>
  [
    "artifacts/S_AI_GROUNDED_BUTTONS_AND_FREE_TEXT_QA_pdf_trace.json",
    "tests/ai/aiPdfAggregatorRequiredForDocumentQuestions.contract.test.ts",
  ].includes(normalizePath(file));

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
  ].includes(file.replace(/\\/g, "/"));

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
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/api/canonicalPdfAuth.transport.ts",
    "src/lib/api/canonicalPdfBackendInvoker.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/pdfRunner.ts",
    "src/lib/pdfRunner.auth.transport.ts",
    "src/lib/lifecycle/lifecycle.s3.test.ts",
    "tests/api/pdfRunnerAuthTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch = (file: string) =>
  [
    "src/lib/api/directorPdfBackendInvoker.ts",
    "src/lib/api/directorPdfBackendInvoker.test.ts",
    "tests/api/directorPdfBackendAuthTransport.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle101AiReportsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/ai_reports.ts",
    "src/lib/ai_reports.transport.ts",
    "tests/api/aiReportsTransportBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle104DirectorReportsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/directorReportsTransport.service.ts",
    "src/lib/api/directorReportsTransport.transport.ts",
    "tests/api/directorReportsAggregationContracts.contract.test.ts",
    "tests/api/directorReportsTransportBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle105PaymentPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/paymentPdf.service.ts",
    "src/lib/api/paymentPdf.transport.ts",
    "tests/api/paymentPdfTransportBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle116WarehouseIncomingFormPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
    "src/screens/warehouse/warehouse.incomingForm.pdf.transport.ts",
    "tests/api/warehouseIncomingFormPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle117WarehouseDayMaterialsPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.transport.ts",
    "tests/api/warehouseDayMaterialsPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle118WarehouseIncomingMaterialsPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.transport.ts",
    "tests/api/warehouseIncomingMaterialsPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle119WarehouseObjectWorkPdfTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
    "src/screens/warehouse/warehouse.objectWorkReport.pdf.transport.ts",
    "tests/api/warehouseObjectWorkPdfTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle120ContractorPdfSourceTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/contractor/contractorPdfSource.service.ts",
    "src/screens/contractor/contractorPdfSource.transport.ts",
    "tests/api/contractorPdfSourceTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
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

const isApprovedAiLiveUiRealAnswersRecoveryPatch = (file: string) => {
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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

const isApprovedAuditNightBattle117DirectorProposalDecisionTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/director/director.proposal.ts",
    "src/screens/director/director.proposal.detail.ts",
    "src/screens/director/director.proposalDecision.transport.ts",
    "src/screens/director/director.proposalDecision.transport.contract.test.ts",
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
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("src/lib/ai/evaluation/goldenBusinessDataset/") ||
    normalized.startsWith("scripts/e2e/runAiRoleMixed150RealAnswers") ||
    normalized.startsWith("tests/ai/aiRoleMixed150") ||
    normalized.startsWith("tests/architecture/aiRoleMixed150") ||
    normalized.startsWith("artifacts/S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE_")
  );
};

const isApprovedAiRoleBusinessCopilotsFullWorkflowsPatch = (file: string) => {
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
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
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("scripts/e2e/runB2C") ||
    normalized.startsWith("src/features/consumerRepair/") ||
    normalized.startsWith("src/lib/consumerRequests/") ||
    normalized.startsWith("tests/consumerRepair/") ||
    normalized.startsWith("tests/architecture/consumerRepair") ||
    normalized.startsWith("artifacts/S_GREEN_CLOSEOUT_") ||
    normalized.startsWith("artifacts/S_GLOBAL_ESTIMATE_PRODUCTION_SAFE_") ||
    normalized.startsWith("artifacts/S_AI_ESTIMATE_TO_PDF_") ||
    normalized.startsWith("artifacts/S_LIVE_AI_ESTIMATE_PDF_REALITY_") ||
    normalized.startsWith("artifacts/pdf/live-ai-estimate-pdf-reality/") ||
    normalized.startsWith("artifacts/S_ANY_ESTIMATE_SOURCE_BACKED_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_BLOCKER_AUDIT_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_REAL_ARCHITECTURE_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_LIVE_ACCEPTANCE_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_150_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_1000_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_10000_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_GREEN_CLAIM_ARTIFACT_RECONCILIATION_") ||
    normalized.startsWith("artifacts/S_ALL_SCREENS_") ||
    normalized.startsWith("artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_") ||
    normalized === "src/features/ai/AIAssistantEstimatePdfActions.tsx" ||
    normalized.startsWith("src/lib/ai/estimatePdf/") ||
    normalized.startsWith("src/lib/estimatePdf/") ||
    normalized.startsWith("tests/aiEstimatePdf/") ||
    normalized.startsWith("tests/pdf/estimatePdf") ||
    normalized.startsWith("tests/liveAcceptance/") ||
    normalized.startsWith("tests/e2e/liveEstimatePdf") ||
    normalized.startsWith("tests/architecture/aiEstimatePdf") ||
    normalized.startsWith("tests/architecture/pdfNo") ||
    normalized === "tests/architecture/liveAcceptanceRequiredForGreen.contract.test.ts" ||
    normalized === "tests/architecture/knownWorkNoGenericRows.contract.test.ts" ||
    normalized.startsWith("tests/architecture/consumerEstimate") ||
    normalized.startsWith("tests/architecture/allScreens") ||
    normalized.startsWith("tests/architecture/releaseCandidate") ||
    normalized.startsWith("tests/allScreensRuntime/") ||
    normalized.startsWith("tests/releaseCandidate/") ||
    normalized.startsWith("tests/globalEstimate/") ||
    normalized.startsWith("tests/estimateIntent/") ||
    normalized.startsWith("tests/globalEstimateAnyWork/") ||
    normalized.startsWith("tests/globalEstimateExternalSources/") ||
    normalized.startsWith("tests/builtInAi/") ||
    normalized === "tests/builtInAi150" ||
    normalized.startsWith("tests/builtInAi150/") ||
    normalized === "tests/builtInAi1000" ||
    normalized.startsWith("tests/builtInAi1000/") ||
    normalized === "tests/builtInAi10000" ||
    normalized.startsWith("tests/builtInAi10000/") ||
    normalized.startsWith("tests/audit/greenClaim") ||
    normalized === "tests/audit/replayVerifiedMatrices.contract.test.ts" ||
    normalized === "tests/audit/releaseGuardUsesReplayLedger.contract.test.ts" ||
    normalized === "tests/audit/dataOpsUiTruthSplit.contract.test.ts" ||
    normalized.startsWith("tests/architecture/globalEstimate") ||
    normalized.startsWith("tests/architecture/anyEstimate") ||
    normalized.startsWith("tests/architecture/builtInAi") ||
    normalized === "tests/architecture/noSilentHistoricalMatrixMutation.contract.test.ts" ||
    normalized === "tests/architecture/noGreenClaimWithoutReplayEvidence.contract.test.ts" ||
    normalized === "tests/architecture/dataOpsOperatorUiCannotBeClaimedByShell.contract.test.ts" ||
    normalized.startsWith("artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_") ||
    normalized.startsWith("artifacts/S_CONTRACTOR_EXPANDED_WORK_MEDIA_") ||
    normalized.startsWith("artifacts/S_RLS_DYNAMIC_CROSS_TENANT_") ||
    normalized.startsWith("scripts/audit/auditStorageBucketPolicies") ||
    normalized.startsWith("scripts/audit/auditSupabasePrivateTableRlsCoverage") ||
    normalized.startsWith("scripts/audit/rlsDynamicCrossTenant.shared") ||
    normalized.startsWith("scripts/audit/runRlsDynamicCrossTenantProof") ||
    normalized.startsWith("scripts/audit/greenClaimArtifactReconciliation") ||
    normalized.startsWith("scripts/audit/runGreenClaimArtifactReconciliation") ||
    normalized === "supabase/migrations/20260522123000_rls_dynamic_cross_tenant_static_coverage.sql" ||
    normalized.startsWith("tests/security/companyUserCannotReadOtherCompany") ||
    normalized.startsWith("tests/security/consumerCannotReadOfficeData") ||
    normalized.startsWith("tests/security/marketplaceDraftOwnerOnly") ||
    normalized.startsWith("tests/security/privatePdfOwnerOnly") ||
    normalized.startsWith("tests/security/rlsDynamicCrossTenant") ||
    normalized.startsWith("tests/architecture/noServiceRoleInFrontend") ||
    normalized.startsWith("tests/architecture/noFrontendOnlyCoreSubmit") ||
    normalized.startsWith("tests/architecture/noDirectStatusWriteFromScreens") ||
    normalized.startsWith("tests/architecture/noDirectMarketplacePublishFromUi") ||
    normalized.startsWith("tests/architecture/noFakePdfStatus") ||
    normalized.startsWith("tests/architecture/coreActionsUseServiceLayer") ||
    normalized.startsWith("tests/architecture/coreMutationIdempotencyDiscipline") ||
    normalized.startsWith("tests/architecture/coreMutationsWriteAuditEvents") ||
    normalized.startsWith("tests/architecture/noScreenRandomClientMutationIds") ||
    normalized === "tests/api/coreMutationId.contract.test.ts" ||
    normalized === "tests/api/directorRequestTransport.contract.test.ts" ||
    normalized === "tests/api/rpcRuntimeValidationBatch2.contract.test.ts" ||
    normalized.startsWith("scripts/audit/auditCoreMutationAuditTrail") ||
    normalized.startsWith("scripts/audit/auditCoreMutationIdempotencyDiscipline") ||
    normalized.startsWith("scripts/audit/auditCoreAuditTrail") ||
    normalized.startsWith("scripts/audit/auditCoreWorkflowTransactions") ||
    normalized.startsWith("scripts/audit/auditCoreServiceBoundaries") ||
    normalized.startsWith("scripts/audit/auditDirectSupabaseWritesFromScreens") ||
    normalized.startsWith("scripts/audit/backendServiceBoundary.shared") ||
    normalized.startsWith("scripts/audit/coreMutationIdempotency.shared") ||
    normalized.startsWith("scripts/audit/coreWorkflows.shared") ||
    normalized.startsWith("scripts/audit/auditObservabilityCoverage") ||
    normalized.startsWith("scripts/audit/auditRateLimitCoverage") ||
    normalized.startsWith("scripts/audit/auditArtifactsNoPii") ||
    normalized.startsWith("scripts/audit/auditSecurityPrivacyHardening") ||
    normalized.startsWith("scripts/audit/auditPiiInArtifacts") ||
    normalized.startsWith("scripts/audit/auditPublicMarketplaceSafeFields") ||
    normalized.startsWith("scripts/audit/auditSignedUrlExpiry") ||
    normalized.startsWith("scripts/audit/auditSecretsInFrontend") ||
    normalized.startsWith("scripts/audit/observabilityOps.shared") ||
    normalized.startsWith("scripts/audit/securityPrivacyHardening.shared") ||
    normalized.startsWith("scripts/e2e/runCoreWorkflowIdempotencyProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimate") ||
    normalized.startsWith("scripts/e2e/runAiEstimate") ||
    normalized.startsWith("scripts/e2e/runLiveAiEstimatePdfRealityProof") ||
    normalized.startsWith("scripts/e2e/runAndroidEstimatePdfSmoke") ||
    normalized.startsWith("scripts/e2e/anyEstimateSourceBackedProofShared") ||
    normalized.startsWith("scripts/e2e/runAnyConstructionEstimate") ||
    normalized.startsWith("scripts/e2e/runAnyEstimate") ||
    normalized.startsWith("scripts/e2e/runAsphalt10000SqMEstimateProof") ||
    normalized.startsWith("scripts/e2e/builtInAiProofShared") ||
    normalized.startsWith("scripts/e2e/runBuiltInAi") ||
    normalized.startsWith("scripts/e2e/runConsumerEstimateTabPdfProof") ||
    normalized.startsWith("scripts/e2e/runBottomNavEstimateAndMarketplacePlusProof") ||
    normalized.startsWith("scripts/e2e/runAllScreens") ||
    normalized === "scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared.ts" ||
    normalized.startsWith("scripts/e2e/runEnterpriseReleaseCandidate") ||
    normalized === "scripts/e2e/enterpriseReleaseCandidate.shared.ts" ||
    normalized === "scripts/e2e/enterpriseReleaseCandidatePolicy.ts" ||
    normalized === "maestro/all-screens-enterprise-runtime.yaml" ||
    normalized === "maestro/enterprise-release-candidate.yaml" ||
    normalized.startsWith("artifacts/S_BACKEND_SERVICE_BOUNDARY_") ||
    normalized.startsWith("artifacts/S_CORE_MUTATION_IDEMPOTENCY_") ||
    normalized.startsWith("artifacts/S_CORE_WORKFLOWS_") ||
    normalized.startsWith("artifacts/S_OBSERVABILITY_") ||
    normalized.startsWith("artifacts/S_SECURITY_PRIVACY_") ||
    normalized === "src/lib/api/coreMutationId.ts" ||
    normalized === "src/lib/ops/productionOpsTelemetry.ts" ||
    normalized === "src/lib/security/securityPrivacyHardening.ts" ||
    normalized === "src/lib/database.types.ts" ||
    normalized === "src/lib/catalog/catalog.proposalCreation.service.ts" ||
    normalized === "src/lib/documents/attachmentOpener.ts" ||
    normalized === "src/lib/documents/attachmentOpener.test.ts" ||
    normalized === "src/screens/director/director.approve.boundary.ts" ||
    normalized === "src/screens/director/director.approve.boundary.test.ts" ||
    normalized === "src/screens/director/director.request.ts" ||
    normalized === "src/screens/director/director.request.boundary.ts" ||
    normalized === "src/screens/director/director.proposal.ts" ||
    normalized === "src/screens/director/director.proposal.detail.ts" ||
    normalized === "src/screens/director/director.proposalDecision.boundary.ts" ||
    normalized === "src/screens/director/director.proposalDecision.transport.contract.test.ts" ||
    normalized === "src/screens/profile/profile.services.ts" ||
    normalized === "src/features/market/market.repository.ts" ||
    normalized === "src/features/market/marketHome.data.ts" ||
    normalized === "src/features/ai/AIAssistantScreen.tsx" ||
    normalized === "src/features/ai/assistantClient.ts" ||
    normalized === "src/features/ai/assistantAnswerPipeline.ts" ||
    normalized.startsWith("src/lib/ai/builtInAi/") ||
    normalized.startsWith("src/lib/ai/builtInAi1000/") ||
    normalized.startsWith("src/lib/ai/builtInAi10000/") ||
    normalized.startsWith("src/lib/ai/sourceIntelligence/") ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
    normalized === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
    normalized === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
    normalized === "src/lib/api/requestDraftSync.service.ts" ||
    normalized === "src/lib/media/services/mediaBackendUploadService.ts" ||
    normalized === "src/screens/warehouse/warehouse.issue.repo.ts" ||
    normalized === "src/screens/warehouse/warehouse.issue.ts" ||
    normalized === "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql" ||
    normalized === "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql" ||
    normalized === "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql" ||
    normalized === "supabase/migrations/20260522100000_media_storage_100k_orphan_retry_backpressure.sql" ||
    normalized === "supabase/migrations/20260522110000_core_txn_marketplace_publish_idempotency.sql" ||
    normalized === "supabase/migrations/20260522190000_whole_app_50k_live_explain_indexes.sql" ||
    normalized === "supabase/migrations/20260522220000_global_estimate_localization_professional_boq_engine.sql" ||
    normalized === "supabase/migrations/20260522233000_global_estimate_data_ops_governance.sql" ||
    normalized === "supabase/migrations/20260523130000_any_estimate_external_source_backed_professional_boq.sql" ||
    normalized.startsWith("tests/core/") ||
    normalized.startsWith("tests/ops/") ||
    normalized.startsWith("tests/security/aiContextSanitizer") ||
    normalized.startsWith("tests/security/noDebugRuntimeProviderUi") ||
    normalized.startsWith("tests/security/noPiiInArtifacts") ||
    normalized.startsWith("tests/security/noSecretsInFrontend") ||
    normalized.startsWith("tests/security/publicMarketplaceSafeFields") ||
    normalized.startsWith("tests/security/signedUrlExpiry") ||
    normalized.startsWith("tests/architecture/noSensitiveDataInArtifacts") ||
    normalized.startsWith("tests/architecture/coreWorkflowNoDuplicateMutation") ||
    normalized === "src/components/layout/AppDetailSheet.tsx" ||
    normalized === "tests/ui/canonicalMobileLayout/AppDetailSheet.contract.test.ts"
  );
};

describe("S-LOAD-FIX-1 hotspot contract", () => {
  it("keeps the S-LOAD-3 staging evidence valid and focused on optimize_next targets", () => {
    const live = readJson("artifacts/S_LOAD_3_live_staging_load_matrix.json");
    const legacy = readJson("artifacts/S_LOAD_1_staging_load_test_matrix.json");

    expect(live.status).toBe("GREEN_STAGING_EXECUTED");
    expect(legacy.liveRun).toBe("completed");
    expect((live.execution as Record<string, unknown>).targetsCollected).toBe(
      5,
    );
    expect(Array.isArray(legacy.targets)).toBe(true);

    const targets = live.targets as Array<Record<string, unknown>>;
    const recommendations = Object.fromEntries(
      targets.map((target) => [target.id, target.recommendation]),
    );
    expect(recommendations).toMatchObject({
      warehouse_issue_queue_page_25: "optimize_next",
      buyer_summary_inbox_page_25: "optimize_next",
      warehouse_stock_page_60: "watch",
    });
  });

  it("keeps warehouse_issue_queue_page_25 bounded and validated without SQL/RPC changes", () => {
    const source = readSource(
      "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    );

    expect(source).toContain("fetchWarehouseIssueQueueScope(");
    expect(source).toContain("offset,");
    expect(source).toContain("normalizedPage.pageSize");
    expect(source).toContain(
      "WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 }",
    );
    expect(source).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(source).toMatch(
      /requireBoundedRpcRows\(\s*validated,\s*"warehouse_issue_queue_scope_v4",\s*normalizedPage\.pageSize,\s*\)/,
    );
    expect(source).toContain("rows length exceeds p_limit");
  });

  it("keeps buyer_summary_inbox_page_25 bounded and validates the RPC envelope", () => {
    const fetcherSource = readSource("src/screens/buyer/buyer.fetchers.ts");
    const serviceSource = readSource(
      "src/screens/buyer/buyer.summary.service.ts",
    );

    expect(fetcherSource).toContain("runContainedRpc(");
    expect(fetcherSource).toContain('"buyer_summary_inbox_scope_v1"');
    expect(fetcherSource).toContain("BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100");
    expect(fetcherSource).toContain("p_offset: normalizedOffsetGroups");
    expect(fetcherSource).toContain("p_limit: normalizedLimitGroups");
    expect(fetcherSource).toContain(
      "validateRpcResponse(data, isRpcRowsEnvelope",
    );
    expect(fetcherSource).toContain('rpcName: "buyer_summary_inbox_scope_v1"');
    expect(serviceSource).toContain("mapWithConcurrencyLimit(");
    expect(serviceSource).toContain("scopes,\n      2,");
  });

  it("keeps the wave inside allowed code and artifact boundaries", () => {
    const changed = dirtyPaths();
    const tryCatchGapsBatchA = isCurrentTryCatchGapsBatchA(changed);
    const forbidden = changed.filter(
      (file) =>
        !(tryCatchGapsBatchA && isApprovedTryCatchGapsBatchAPatch(file)) &&
        !isLaterApprovedWarehouseIssueSourcePatch(file) &&
        !isApprovedAiActionLedgerMigrationProposal(file) &&
        !isApprovedAiTraceObservabilityPatch(file) &&
        !isApprovedAiDirectorCommandOfficeSecurityMagicPatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
        !isApprovedScaleBoundedDatabaseQueriesPatch(file) &&
        !isApprovedSScale03TimerRealtimeLifecyclePatch(file) &&
        !isApprovedDirectSupabaseBypassBatch1Patch(file) &&
        !isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle101AiReportsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle104DirectorReportsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle105PaymentPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle116WarehouseIncomingFormPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle117WarehouseDayMaterialsPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle118WarehouseIncomingMaterialsPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle119WarehouseObjectWorkPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle120ContractorPdfSourceTransportBoundaryPatch(file) &&
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
        !isApprovedAuditNightBattle117DirectorProposalDecisionTransportBoundaryPatch(file) &&
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
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|ios\/|android\/|supabase\/migrations\/|maestro\/|node_modules\/|android\/app\/build\/)/.test(
          file.replace(/\\/g, "/"),
        ) ||
          /\.(?:apk|aab)$/i.test(file) ||
          /(?:pdf|report|export|detail)/i.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
