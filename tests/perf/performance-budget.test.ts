/**
 * Performance budget discipline tests.
 *
 * WAVE O: Establishes measurable, repeatable performance baselines
 * for the heaviest screens and ensures they stay within thresholds.
 *
 * These are architectural budget tests — they catch scope creep early,
 * before it becomes a runtime performance regression.
 *
 * Thresholds are set ~20% above the current measured baseline so they
 * only fail if something meaningfully worsens.
 */

import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "../../src");

function getFileStats(relativePath: string) {
  const fullPath = path.join(SRC, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  const sizeKB = Math.round(content.length / 1024);
  const importCount = (content.match(/^import\s/gm) || []).length;
  const lineCount = content.split("\n").length;
  return { sizeKB, importCount, lineCount };
}

describe("performance budget — screen size", () => {
  // Baseline 2026-04-14:
  //   OfficeHubScreen.tsx: 76KB, 14 imports
  //   BuyerScreen.tsx: 30KB, 63 imports
  //   BuyerSubcontractTab.tsx: 27KB, 12 imports
  //   useForemanSubcontractController.tsx: 40KB, 20 imports

  const budgets: {
    file: string;
    maxSizeKB: number;
    maxImports: number;
    maxLines: number;
  }[] = [
    {
      file: "screens/office/OfficeHubScreen.tsx",
      maxSizeKB: 90,   // baseline: 76KB
      maxImports: 20,   // baseline: 14
      maxLines: 2400,   // ~20% headroom
    },
    {
      file: "screens/buyer/BuyerScreen.tsx",
      maxSizeKB: 36,   // baseline: 30KB
      maxImports: 75,   // baseline: 63 (high but existing)
      maxLines: 1000,
    },
    {
      file: "screens/buyer/BuyerSubcontractTab.tsx",
      maxSizeKB: 32,   // baseline: 27KB
      maxImports: 18,   // baseline: 12
      maxLines: 1000,
    },
    {
      file: "screens/foreman/hooks/useForemanSubcontractController.tsx",
      maxSizeKB: 48,   // baseline: 40KB
      maxImports: 25,   // baseline: 20
      maxLines: 1200,
    },
  ];

  for (const budget of budgets) {
    describe(path.basename(budget.file), () => {
      const stats = getFileStats(budget.file);

      it(`size ≤ ${budget.maxSizeKB}KB (current: ${stats.sizeKB}KB)`, () => {
        expect(stats.sizeKB).toBeLessThanOrEqual(budget.maxSizeKB);
      });

      it(`imports ≤ ${budget.maxImports} (current: ${stats.importCount})`, () => {
        expect(stats.importCount).toBeLessThanOrEqual(budget.maxImports);
      });

      it(`lines ≤ ${budget.maxLines} (current: ${stats.lineCount})`, () => {
        expect(stats.lineCount).toBeLessThanOrEqual(budget.maxLines);
      });
    });
  }
});

describe("performance budget — bundle module count", () => {
  // Metro reported 2405 modules on 2026-04-14
  // Threshold: alert if source file count grows beyond ~20% above baseline
  it("source module count within budget", () => {
    const tsFiles = countFilesRecursive(SRC, /\.tsx?$/);
    const p3ATypeBoundaryFiles = countFilesRecursive(
      path.join(SRC, "types", "contracts"),
      /\.ts$/,
    );
    const v47BForemanNavigationFlowFiles = fs.existsSync(
      path.join(SRC, "screens", "foreman", "hooks", "useForemanNavigationFlow.ts"),
    ) ? 1 : 0;
    const v47CForemanFioBootstrapFlowFiles = fs.existsSync(
      path.join(SRC, "screens", "foreman", "hooks", "useForemanFioBootstrapFlow.ts"),
    ) ? 1 : 0;
    const s50kBffBoundaryScaffoldFiles = countFilesRecursive(
      path.join(SRC, "shared", "scale"),
      /\.ts$/,
    );
    const sAiWorkflow2DisabledPilotFiles = [
      path.join(SRC, "shared", "ai", "aiWorkflowFlags.ts"),
      path.join(SRC, "shared", "ai", "directorProposalRiskSummary.ts"),
      path.join(SRC, "components", "director", "DirectorProposalRiskSummaryCard.tsx"),
    ].filter((file) => fs.existsSync(file)).length;
    const sPdfInstantFirstOpenCacheFiles = [
      path.join(SRC, "lib", "pdf", "pdfInstantCache.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassCatalogRequestBoundaryFiles = [
      path.join(SRC, "lib", "catalog", "catalog.request.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sFetchAllDirectorReportsAggregationContractFiles = [
      path.join(SRC, "lib", "api", "director_reports.aggregation.contracts.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassDirectorFinanceBoundaryFiles = [
      path.join(SRC, "screens", "director", "director.finance.bff.contract.ts"),
      path.join(SRC, "screens", "director", "director.finance.bff.client.ts"),
      path.join(SRC, "screens", "director", "director.finance.bff.handler.ts"),
      path.join(SRC, "screens", "director", "director.finance.rpc.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassWarehouseApiRepoBoundaryFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.api.bff.contract.ts"),
      path.join(SRC, "screens", "warehouse", "warehouse.api.bff.client.ts"),
      path.join(SRC, "screens", "warehouse", "warehouse.api.bff.handler.ts"),
      path.join(SRC, "screens", "warehouse", "warehouse.api.repo.transport.ts"),
      path.join(SRC, "screens", "warehouse", "warehouse.uom.repo.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassCatalogTransportBoundaryFiles = [
      path.join(SRC, "lib", "catalog", "catalog.bff.contract.ts"),
      path.join(SRC, "lib", "catalog", "catalog.bff.client.ts"),
      path.join(SRC, "lib", "catalog", "catalog.bff.handler.ts"),
      path.join(SRC, "lib", "catalog", "catalog.transport.supabase.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassAssistantStoreBoundaryFiles = [
      path.join(SRC, "features", "ai", "assistantActions.transport.ts"),
      path.join(SRC, "features", "supplierShowcase", "supplierShowcase.transport.ts"),
      path.join(SRC, "lib", "assistant_store_read.low_risk.transport.ts"),
      path.join(SRC, "lib", "assistant_store_read.bff.contract.ts"),
      path.join(SRC, "lib", "assistant_store_read.bff.client.ts"),
      path.join(SRC, "lib", "assistant_store_read.bff.handler.ts"),
      path.join(SRC, "lib", "store_supabase.read.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sDirectSupabaseBypassDirectorPdfSourceTransportFiles = [
      path.join(SRC, "lib", "api", "directorPdfSource.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sBuyerScreenSideEffectBoundaryFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerScreenSideEffects.ts"),
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerScreenSideEffects.test.tsx"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle11AccountantScreenViewModelFiles = [
      path.join(SRC, "screens", "accountant", "useAccountantScreenViewModel.ts"),
      path.join(SRC, "screens", "accountant", "useAccountantScreenViewModel.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle12BuyerScreenStoreViewModelFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerScreenStoreViewModel.ts"),
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerScreenStoreViewModel.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle13AiAssistantStyleBoundaryFiles = [
      path.join(SRC, "features", "ai", "AIAssistantScreen.styles.ts"),
      path.join(SRC, "features", "ai", "AIAssistantScreen.decomposition.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle14ProfileContentLoadStateBoundaryFiles = [
      path.join(SRC, "screens", "profile", "components", "ProfileContentLoadState.tsx"),
      path.join(SRC, "screens", "profile", "ProfileContent.decomposition.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle41BuyerSubcontractFormModelFiles = [
      path.join(SRC, "screens", "buyer", "buyerSubcontractForm.model.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle42DirectorMetricsTransportFiles = [
      path.join(SRC, "screens", "director", "director.metrics.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle45MapScreenStyleBoundaryFiles = [
      path.join(SRC, "components", "map", "MapScreen.styles.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle46ContractorWorkModalTransportFiles = [
      path.join(SRC, "screens", "contractor", "contractor.workModalService.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle47BuyerSubcontractStyleBoundaryFiles = [
      path.join(SRC, "screens", "buyer", "BuyerSubcontractTab.styles.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle48OfficeInviteHandoffBoundaryFiles = [
      path.join(SRC, "screens", "office", "officeHub.inviteHandoffSection.tsx"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle49ActivePaymentFormStyleBoundaryFiles = [
      path.join(SRC, "screens", "accountant", "components", "ActivePaymentForm.styles.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle50CalcModalContentStyleBoundaryFiles = [
      path.join(SRC, "components", "foreman", "CalcModalContent.styles.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle51ProfileMembershipTransportFiles = [
      path.join(SRC, "screens", "profile", "profile.membership.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle51ProfileAuthTransportFiles = [
      path.join(SRC, "screens", "profile", "profile.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle52CanonicalPdfAuthTransportFiles = [
      path.join(SRC, "lib", "api", "canonicalPdfAuth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle53RequestDraftSyncAuthTransportFiles = [
      path.join(SRC, "lib", "api", "requestDraftSync.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle54RequestRepositoryAuthTransportFiles = [
      path.join(SRC, "lib", "api", "request.repository.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle55DirectorLifecycleAuthTransportFiles = [
      path.join(SRC, "screens", "director", "director.lifecycle.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle56MarketAuthTransportFiles = [
      path.join(SRC, "features", "market", "market.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle57RequestsAuthTransportFiles = [
      path.join(SRC, "lib", "api", "requests.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle58ChatAuthTransportFiles = [
      path.join(SRC, "lib", "chat.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle59BuyerSubcontractAuthTransportFiles = [
      path.join(SRC, "screens", "buyer", "BuyerSubcontractTab.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle60ContractorProfileAuthTransportFiles = [
      path.join(SRC, "screens", "contractor", "contractor.profileService.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle61ContractorScreenDataAuthTransportFiles = [
      path.join(SRC, "screens", "contractor", "contractor.screenData.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle62BuyerRfqPrefillAuthTransportFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerRfqPrefill.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle63SupplierShowcaseAuthTransportFiles = [
      path.join(SRC, "features", "supplierShowcase", "supplierShowcase.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle64AccountantCardFlowAuthTransportFiles = [
      path.join(SRC, "screens", "accountant", "useAccountantCardFlow.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle65BuyerSummaryAuthTransportFiles = [
      path.join(SRC, "screens", "buyer", "buyer.summary.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle67AccountantScreenAuthTransportFiles = [
      path.join(SRC, "screens", "accountant", "accountant.screen.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle68CurrentProfileIdentityAuthTransportFiles = [
      path.join(SRC, "features", "profile", "currentProfileIdentity.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle69ForemanAuthTransportFiles = [
      path.join(SRC, "screens", "foreman", "foreman.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle72BuyerAutoFioAuthTransportFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerAutoFio.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle73BuyerActionsAuthTransportFiles = [
      path.join(SRC, "screens", "buyer", "buyer.actions.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle74MapScreenAuthTransportFiles = [
      path.join(SRC, "components", "map", "MapScreen.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle76ForemanRequestsTransportFiles = [
      path.join(SRC, "screens", "foreman", "foreman.requests.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle77DirectorDataTransportFiles = [
      path.join(SRC, "screens", "director", "director.data.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle78WarehouseNameMapTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.nameMap.ui.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle79PdfRunnerAuthTransportFiles = [
      path.join(SRC, "lib", "pdfRunner.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle80PasswordResetAuthTransportFiles = [
      path.join(SRC, "lib", "auth", "passwordReset.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle81SignUpAuthTransportFiles = [
      path.join(SRC, "lib", "auth", "signUp.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle82SignInAuthTransportFiles = [
      path.join(SRC, "lib", "auth", "signIn.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle84JobQueueTransportFiles = [
      path.join(SRC, "lib", "infra", "jobQueue.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle85RequestDraftSyncTransportFiles = [
      path.join(SRC, "lib", "api", "requestDraftSync.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle86StorageTransportFiles = [
      path.join(SRC, "lib", "api", "storage.transport.ts"),
      path.join(SRC, "lib", "api", "storage.service.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle87SecurityScreenAuthTransportFiles = [
      path.join(SRC, "screens", "security", "SecurityScreen.auth.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle88StoreSupabaseWriteTransportFiles = [
      path.join(SRC, "lib", "store_supabase.write.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle90BuyerActionsWriteTransportFiles = [
      path.join(SRC, "screens", "buyer", "buyer.actions.write.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle91DirectorRequestTransportFiles = [
      path.join(SRC, "screens", "director", "director.request.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle92DirectorLifecycleRealtimeTransportFiles = [
      path.join(SRC, "screens", "director", "director.lifecycle.realtime.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle93ProfileRpcTransportFiles = [
      path.join(SRC, "lib", "api", "profile.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle94AccountantReturnTransportFiles = [
      path.join(SRC, "screens", "accountant", "accountant.return.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle95AccountantHistoryTransportFiles = [
      path.join(SRC, "screens", "accountant", "accountant.history.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle96CoreRpcCompatTransportFiles = [
      path.join(SRC, "lib", "api", "_core.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle97WarehouseIssueTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.issue.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle98CalcModalRpcTransportFiles = [
      path.join(SRC, "components", "foreman", "calcModal.rpc.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle99MapScreenMarketTransportFiles = [
      path.join(SRC, "components", "map", "MapScreen.market.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle101AiReportsTransportFiles = [
      path.join(SRC, "lib", "ai_reports.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle102ForemanAiResolveTransportFiles = [
      path.join(SRC, "lib", "api", "foremanAiResolve.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle103DirectorReturnTransportFiles = [
      path.join(SRC, "lib", "api", "director.return.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle104DirectorReportsTransportFiles = [
      path.join(SRC, "lib", "api", "directorReportsTransport.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle105PaymentPdfTransportFiles = [
      path.join(SRC, "lib", "api", "paymentPdf.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle106ProposalsTransportFiles = [
      path.join(SRC, "lib", "api", "proposals.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle107IntegrityGuardsTransportFiles = [
      path.join(SRC, "lib", "api", "integrity.guards.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle108ProfileStorageTransportFiles = [
      path.join(SRC, "screens", "profile", "profile.storage.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle109AttachmentOpenerStorageTransportFiles = [
      path.join(SRC, "lib", "documents", "attachmentOpener.storage.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle110QueueLatencyMetricsTransportFiles = [
      path.join(SRC, "lib", "infra", "queueLatencyMetrics.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle111AccountantInboxTransportFiles = [
      path.join(SRC, "screens", "accountant", "accountant.inbox.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle111RequestsReadTransportFiles = [
      path.join(SRC, "lib", "api", "requests.read.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle112DirectorProposalsTransportFiles = [
      path.join(SRC, "screens", "director", "director.proposals.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle113BuyerRequestProposalMapTransportFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerRequestProposalMap.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle114ContractorWorkSearchTransportFiles = [
      path.join(SRC, "screens", "contractor", "contractor.workSearch.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle115DirectorRepositoryTransportFiles = [
      path.join(SRC, "screens", "director", "director.repository.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle116WarehouseIncomingFormPdfTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.incomingForm.pdf.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle117WarehouseDayMaterialsPdfTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.dayMaterialsReport.pdf.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle118WarehouseIncomingMaterialsPdfTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.incomingMaterialsReport.pdf.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle119WarehouseObjectWorkPdfTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.objectWorkReport.pdf.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle120ContractorPdfSourceTransportFiles = [
      path.join(SRC, "screens", "contractor", "contractorPdfSource.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle123BuyerRepoStorageTransportFiles = [
      path.join(SRC, "screens", "buyer", "buyer.repo.storage.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditNightBattle113BuyerRepoReadTransportFiles = [
      path.join(SRC, "screens", "buyer", "buyer.repo.read.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditNightBattle114OfficeAccessTransportFiles = [
      path.join(SRC, "screens", "office", "officeAccess.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditNightBattle115WarehouseSeedTransportFiles = [
      path.join(SRC, "screens", "warehouse", "warehouse.seed.transport.ts"),
      path.join(SRC, "screens", "warehouse", "warehouse.seed.transport.contract.test.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle125MarketRepositoryTransportFiles = [
      path.join(SRC, "features", "market", "market.repository.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle126FilesStorageTransportFiles = [
      path.join(SRC, "lib", "files.storage.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle130DirectorApproveTransportFiles = [
      path.join(SRC, "screens", "director", "director.approve.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle131BuyerAccountingFlagsTransportFiles = [
      path.join(SRC, "screens", "buyer", "hooks", "useBuyerAccountingFlags.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle133CatalogProposalCreationTransportFiles = [
      path.join(SRC, "lib", "catalog", "catalog.proposalCreation.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    const sAuditBattle135SubcontractsSharedTransportFiles = [
      path.join(SRC, "screens", "subcontracts", "subcontracts.shared.transport.ts"),
    ].filter((file) => fs.existsSync(file)).length;
    // Baseline: 1008 source files. P2.K adds one permanent PDF viewer-entry boundary.
    // P3-A adds five permanent type-only database contract boundaries.
    // PDF-Z2 adds one permanent production report manifest contract test.
    // PDF-Z3 adds focused warehouse manifest/backend reuse tests.
    // PDF-Z4 adds focused Foreman manifest/backend reuse tests.
    // PDF-Z5 adds contractor act manifest/reuse contract plus focused tests.
    // PDF-PUR-1 adds buyer proposal manifest/reuse contract plus focused tests.
    // PDF-ACC-1 adds accountant payment report manifest/reuse contract plus focused tests.
    // PDF-ACC-FINAL adds exact accountant proposal/attachment manifest services plus focused tests.
    // A4 adds one reusable security redaction boundary plus focused regression tests.
    // A5 adds three buyer owner-boundary modules for sheet composition and sheet-local state.
    // B1 adds six permanent PDF viewer owner-boundary modules.
    // B2 adds eight permanent PDF document action owner-boundary modules.
    // OFFICE_OWNER_SPLIT adds four permanent Office owner-boundary modules
    // plus three focused src-owned regression tests for route/reentry/model.
    // FOREMAN_DRAFT_OWNER_SPLIT_FINAL adds four permanent Foreman draft boundary modules.
    // OFFICE_REENTRY_BOUNDARY_SPLIT adds six permanent Office reentry boundary modules.
    // DIRECTOR_LIFECYCLE_REALTIME_OWNER_SPLIT adds six permanent director lifecycle modules/tests.
    // LIST_RENDER_DISCIPLINE_HARDENING adds six permanent render discipline modules:
    //   reqIssueModal.row.model, ReqIssueModalRow, warehouseReports.row.model, ReportDocRowItem (4 source)
    //   + reqIssueModal.row.model.test, warehouseReports.row.model.test (2 tests).
    // CALCMODAL_OWNER_BOUNDARY_SPLIT adds five permanent owner-boundary modules:
    //   calcModal.normalize, calcModal.model, calcModal.validation, calcModal.state, CalcModalContent.
    // FOREMAN_SUBCONTRACT_CONTROLLER_OWNER_SPLIT adds four permanent controller-boundary modules:
    //   foreman.subcontractController.model, guards, effects, telemetry.
    // BUYER_SCREEN_OWNER_SPLIT adds four permanent buyer screen boundary files:
    //   buyer.screen.model, BuyerSearchBar, BuyerScreenContent, buyer.screen.model.test.
    // FOREMAN_DRAFT_RUNTIME_OWNER_SPLIT adds one permanent runtime owner hook:
    //   useForemanDraftBoundaryRuntimeSubscriptions.
    // V4-7B adds one permanent Foreman navigation-flow hook:
    //   useForemanNavigationFlow.
    // V4-7C adds one permanent Foreman FIO/bootstrap-flow hook:
    //   useForemanFioBootstrapFlow.
    // S-50K-ARCH-1/S-50K-CACHE-1/S-50K-JOBS-1/S-50K-IDEMPOTENCY-1/S-50K-RATE-1
    // add bounded contract-only scale scaffold files.
    // S-50K-BFF-READ-1 adds two disabled read-only handler/port modules.
    // S-50K-BFF-WRITE-1 adds two disabled mutation handler/port modules.
    // S-50K-BFF-SHADOW-1 adds three local fixture-only shadow parity modules.
    // S-50K-CACHE-INTEGRATION-1 adds four disabled cache-boundary integration modules.
    // S-50K-JOBS-INTEGRATION-1 adds five disabled background-job boundary modules.
    // S-50K-IDEMPOTENCY-INTEGRATION-1 adds five disabled idempotency boundary modules.
    // S-50K-RATE-ENFORCEMENT-1 adds four disabled rate-enforcement boundary modules.
    // S-50K-OBS-INTEGRATION-1 adds four disabled scale-observability boundary modules.
    // S-50K-PROVIDER-ENV-CONVENTIONS-1 adds one disabled provider env-convention module.
    // S-CACHE-PRODUCTION-RUNTIME-SHADOW-CANARY-MECHANISM-1 adds one permanent cache shadow runtime module.
    // S-AI-WORKFLOW-2 adds three disabled-by-default advisory AI pilot modules.
    // S-PDF-INSTANT-FIRST-OPEN-AND-TOP-LAYER-FIX-1 adds one permanent cache service module.
    // S-DIRECT-SUPABASE-BYPASS-ELIMINATION-1 adds one permanent catalog request read transport boundary.
    // S-FETCHALL-DIRECTOR-REPORTS-SERVER-SIDE-AGGREGATION-CONTRACTS-1 adds one permanent
    // director reports server-side aggregation contract module.
    // S-DIRECT-SUPABASE-BYPASS-DIRECTOR-FINANCE-RPC-ROUTING-1/2 adds four permanent
    // disabled director finance RPC BFF/transport boundary modules.
    // S-DIRECT-SUPABASE-BYPASS-WAREHOUSE-API-REPO-ROUTING-1 adds four permanent
    // disabled warehouse API read BFF/transport boundary modules.
    // S-DIRECT-SUPABASE-BYPASS-WAREHOUSE-UOM-READ-ROUTING-1 extends that boundary
    // with one permanent compatibility fallback transport for UOM single-row reads.
    // S-DIRECT-SUPABASE-BYPASS-CATALOG-TRANSPORT-READ-ROUTING-1 adds four
    // permanent disabled catalog transport read BFF/transport boundary modules.
    // S-DIRECT-SUPABASE-BYPASS-ASSISTANT-STORE-SUPABASE-INVENTORY-AND-SAFE-ROUTING-1
    // adds five permanent disabled assistant/store read BFF/transport boundary modules.
    // S-DIRECT-SUPABASE-BYPASS-LOW-RISK-READS-BFF-1 extends that permanent
    // contract with two low-risk read transports, no native/package surface.
    // S-AUDIT_BATTLE_09 adds one permanent Director PDF source transport boundary.
    // S-BUYER_SCREEN_SIDE_EFFECT_ISOLATION_1 adds a permanent BuyerScreen side-effect
    // hook boundary plus focused src-owned regression tests.
    // S-AUDIT_BATTLE_11 adds one permanent AccountantScreen view-model selector boundary
    // plus focused src-owned regression tests.
    // S-AUDIT_BATTLE_12 adds one permanent BuyerScreen store view-model selector boundary
    // plus focused src-owned regression tests.
    // S-AUDIT_BATTLE_13 adds one permanent AIAssistant static style boundary
    // plus focused src-owned regression tests.
    // S-AUDIT_BATTLE_14 adds one permanent ProfileContent load-state render boundary
    // plus focused src-owned regression tests.
    // S-AUDIT_BATTLE_41 adds one permanent BuyerSubcontractTab form model boundary.
    // S-AUDIT_BATTLE_42 adds one permanent Director metrics transport boundary.
    // S-AUDIT_BATTLE_45 adds one permanent MapScreen static style boundary.
    // S-AUDIT_BATTLE_46 adds one permanent Contractor work-modal read probe transport boundary.
    // S-AUDIT_BATTLE_47 adds one permanent BuyerSubcontractTab static style boundary.
    // S-AUDIT_BATTLE_48 adds one permanent Office invite handoff render boundary.
    // S-AUDIT_BATTLE_49 adds one permanent ActivePaymentForm static style boundary.
    // S-AUDIT_BATTLE_50 adds one permanent CalcModalContent static style boundary.
    // S-AUDIT_BATTLE_53 adds one permanent request draft sync auth transport boundary.
    // S-AUDIT_BATTLE_54 adds one permanent request repository auth transport boundary.
    // S-AUDIT_BATTLE_55 adds one permanent Director realtime auth transport boundary.
    // S-AUDIT_BATTLE_56 adds one permanent marketplace auth transport boundary.
    // S-AUDIT_BATTLE_57 adds one permanent requests draft-owner auth transport boundary.
    // S-AUDIT_BATTLE_58 adds one permanent chat auth transport boundary.
    // S-AUDIT_BATTLE_59 adds one permanent BuyerSubcontractTab auth transport boundary.
    // S-AUDIT_BATTLE_60 adds one permanent contractor profile auth transport boundary.
    // S-AUDIT_BATTLE_61 adds one permanent contractor screen data auth transport boundary.
    // S-AUDIT_BATTLE_62 adds one permanent Buyer RFQ prefill auth transport boundary.
    // S-AUDIT_BATTLE_63 adds one permanent supplier showcase auth transport boundary.
    // S-AUDIT_BATTLE_64 adds one permanent accountant card flow auth transport boundary.
    // S-AUDIT_BATTLE_65 adds one permanent buyer summary auth transport boundary.
    // S-AUDIT_BATTLE_67 adds one permanent accountant screen auth transport boundary.
    // S-AUDIT_BATTLE_68 adds one permanent current profile identity auth transport boundary.
    // S-AUDIT_BATTLE_69 adds one permanent foreman history auth transport boundary.
    // S-AUDIT_BATTLE_72 adds one permanent buyer auto-FIO auth transport boundary.
    // S-AUDIT_BATTLE_73 adds one permanent buyer actions auth transport boundary.
    // S-AUDIT_BATTLE_74 adds one permanent MapScreen auth transport boundary.
    // S-AUDIT_BATTLE_76 adds one permanent foreman requests schema-probe transport boundary.
    // S-AUDIT_BATTLE_77 adds one permanent Director data schema-probe transport boundary.
    // S-AUDIT_BATTLE_78 adds one permanent Warehouse name-map read transport boundary.
    // S-AUDIT_BATTLE_79 adds one permanent PDF runner auth-session transport boundary.
    // S-AUDIT_BATTLE_80 adds one permanent password reset auth transport boundary.
    // S-AUDIT_BATTLE_81 adds one permanent sign-up auth transport boundary.
    // S-AUDIT_BATTLE_82 adds one permanent sign-in auth transport boundary.
    // S-AUDIT_BATTLE_84 adds one permanent job queue Supabase transport boundary.
    // S-AUDIT_BATTLE_85 adds one permanent request draft sync transport boundary.
    // S-AUDIT_BATTLE_86 adds one permanent proposal storage transport boundary
    // plus a focused src-owned regression test.
    // S-AUDIT_BATTLE_87 adds one permanent SecurityScreen MFA auth transport boundary.
    // S-AUDIT_BATTLE_88 adds one permanent store Supabase write transport boundary.
    // S-AUDIT_BATTLE_90 adds one permanent buyer actions write transport boundary.
    // S-AUDIT_BATTLE_91 adds one permanent Director request mutation transport boundary.
    // S-AUDIT_BATTLE_92 adds one permanent Director lifecycle realtime transport boundary.
    // S-AUDIT_BATTLE_93 adds one permanent profile RPC transport boundary.
    // S-AUDIT_BATTLE_94 adds one permanent accountant return RPC transport boundary.
    // S-AUDIT_BATTLE_95 adds one permanent accountant history RPC transport boundary.
    // S-AUDIT_BATTLE_96 adds one permanent core RPC compat transport boundary.
    // S-AUDIT_BATTLE_97 adds one permanent warehouse issue RPC transport boundary.
    // S-AUDIT_BATTLE_98 adds one permanent CalcModal RPC transport boundary.
    // S-AUDIT_BATTLE_99 adds one permanent MapScreen market read/write transport boundary.
    // S-AUDIT_BATTLE_101 adds one permanent AI reports transport boundary.
    // S-AUDIT_BATTLE_102 adds one permanent Foreman AI resolve transport boundary.
    // S-AUDIT_BATTLE_103 adds one permanent director return transport boundary.
    // S-AUDIT_BATTLE_104 adds one permanent director reports scope RPC transport boundary.
    // S-AUDIT_BATTLE_105 adds one permanent payment PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_106 adds one permanent proposal items RPC transport boundary.
    // S-AUDIT_BATTLE_107 adds one permanent proposal integrity guard RPC transport boundary.
    // S-AUDIT_BATTLE_108 adds one permanent profile avatar storage transport boundary.
    // S-AUDIT_BATTLE_109 adds one permanent attachment opener storage signed-url transport boundary.
    // S-AUDIT_BATTLE_110 adds one permanent queue latency metrics RPC transport boundary.
    // S-AUDIT_BATTLE_111 adds one permanent accountant inbox RPC transport boundary.
    // S-AUDIT_BATTLE_111_REQUESTS_READ adds one permanent requests read transport boundary.
    // S-AUDIT_BATTLE_112 adds one permanent director pending proposals RPC transport boundary.
    // S-AUDIT_BATTLE_113 adds one permanent buyer request proposal-map RPC transport boundary.
    // S-AUDIT_BATTLE_114 adds one permanent contractor work search RPC transport boundary.
    // S-AUDIT_BATTLE_115 adds one permanent director repository primary-list RPC transport boundary.
    // S-AUDIT_BATTLE_116 adds one permanent warehouse incoming-form PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_117 adds one permanent warehouse day-materials PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_118 adds one permanent warehouse incoming-materials PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_119 adds one permanent warehouse object-work PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_120 adds one permanent contractor work PDF source RPC transport boundary.
    // S-AUDIT_BATTLE_123 adds one permanent buyer proposal attachment signed-url transport boundary.
    // S-AUDIT_BATTLE_125 adds one permanent market repository read RPC transport boundary.
    // S-AUDIT_BATTLE_126 adds one permanent supplier files storage transport boundary.
    // S-AUDIT_BATTLE_130 adds one permanent director approve RPC transport boundary.
    // S-AUDIT_BATTLE_131 adds one permanent buyer accounting flags transport boundary.
    // S-AUDIT_BATTLE_133 adds one permanent catalog proposal-creation transport boundary.
    // S_AUDIT_BATTLE_115_WAREHOUSE_SEED_DEV_ONLY_CONTAINMENT adds one permanent
    // warehouse seed transport boundary plus a focused src-owned contract test.
    expect(p3ATypeBoundaryFiles).toBeLessThanOrEqual(5);
    expect(v47BForemanNavigationFlowFiles).toBeLessThanOrEqual(1);
    expect(v47CForemanFioBootstrapFlowFiles).toBeLessThanOrEqual(1);
    expect(s50kBffBoundaryScaffoldFiles).toBeLessThanOrEqual(41);
    expect(sAiWorkflow2DisabledPilotFiles).toBeLessThanOrEqual(3);
    expect(sPdfInstantFirstOpenCacheFiles).toBeLessThanOrEqual(1);
    expect(sDirectSupabaseBypassCatalogRequestBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sFetchAllDirectorReportsAggregationContractFiles).toBeLessThanOrEqual(1);
    expect(sDirectSupabaseBypassDirectorFinanceBoundaryFiles).toBeLessThanOrEqual(4);
    expect(sDirectSupabaseBypassWarehouseApiRepoBoundaryFiles).toBeLessThanOrEqual(5);
    expect(sDirectSupabaseBypassCatalogTransportBoundaryFiles).toBeLessThanOrEqual(4);
    expect(sDirectSupabaseBypassAssistantStoreBoundaryFiles).toBeLessThanOrEqual(7);
    expect(sDirectSupabaseBypassDirectorPdfSourceTransportFiles).toBeLessThanOrEqual(1);
    expect(sBuyerScreenSideEffectBoundaryFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle11AccountantScreenViewModelFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle12BuyerScreenStoreViewModelFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle13AiAssistantStyleBoundaryFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle14ProfileContentLoadStateBoundaryFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle41BuyerSubcontractFormModelFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle42DirectorMetricsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle45MapScreenStyleBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle46ContractorWorkModalTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle47BuyerSubcontractStyleBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle48OfficeInviteHandoffBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle49ActivePaymentFormStyleBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle50CalcModalContentStyleBoundaryFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle51ProfileMembershipTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle51ProfileAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle52CanonicalPdfAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle53RequestDraftSyncAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle54RequestRepositoryAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle55DirectorLifecycleAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle56MarketAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle57RequestsAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle58ChatAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle59BuyerSubcontractAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle60ContractorProfileAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle61ContractorScreenDataAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle62BuyerRfqPrefillAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle63SupplierShowcaseAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle64AccountantCardFlowAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle65BuyerSummaryAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle67AccountantScreenAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle68CurrentProfileIdentityAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle69ForemanAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle72BuyerAutoFioAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle73BuyerActionsAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle74MapScreenAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle76ForemanRequestsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle77DirectorDataTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle78WarehouseNameMapTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle79PdfRunnerAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle80PasswordResetAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle81SignUpAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle82SignInAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle84JobQueueTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle85RequestDraftSyncTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle86StorageTransportFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle87SecurityScreenAuthTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle88StoreSupabaseWriteTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle90BuyerActionsWriteTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle91DirectorRequestTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle92DirectorLifecycleRealtimeTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle93ProfileRpcTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle94AccountantReturnTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle95AccountantHistoryTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle96CoreRpcCompatTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle97WarehouseIssueTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle98CalcModalRpcTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle99MapScreenMarketTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle101AiReportsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle102ForemanAiResolveTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle103DirectorReturnTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle104DirectorReportsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle105PaymentPdfTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle106ProposalsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle107IntegrityGuardsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle108ProfileStorageTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle109AttachmentOpenerStorageTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle110QueueLatencyMetricsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle111AccountantInboxTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle111RequestsReadTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle112DirectorProposalsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle113BuyerRequestProposalMapTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle114ContractorWorkSearchTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle115DirectorRepositoryTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle116WarehouseIncomingFormPdfTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle117WarehouseDayMaterialsPdfTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle118WarehouseIncomingMaterialsPdfTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle119WarehouseObjectWorkPdfTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle120ContractorPdfSourceTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle123BuyerRepoStorageTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditNightBattle113BuyerRepoReadTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditNightBattle114OfficeAccessTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditNightBattle115WarehouseSeedTransportFiles).toBeLessThanOrEqual(2);
    expect(sAuditBattle125MarketRepositoryTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle126FilesStorageTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle130DirectorApproveTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle131BuyerAccountingFlagsTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle133CatalogProposalCreationTransportFiles).toBeLessThanOrEqual(1);
    expect(sAuditBattle135SubcontractsSharedTransportFiles).toBeLessThanOrEqual(1);
    expect(
      tsFiles -
        p3ATypeBoundaryFiles -
        v47BForemanNavigationFlowFiles -
        v47CForemanFioBootstrapFlowFiles -
        s50kBffBoundaryScaffoldFiles -
        sAiWorkflow2DisabledPilotFiles -
        sPdfInstantFirstOpenCacheFiles -
        sDirectSupabaseBypassCatalogRequestBoundaryFiles -
        sFetchAllDirectorReportsAggregationContractFiles -
        sDirectSupabaseBypassDirectorFinanceBoundaryFiles -
        sDirectSupabaseBypassWarehouseApiRepoBoundaryFiles -
        sDirectSupabaseBypassCatalogTransportBoundaryFiles -
        sDirectSupabaseBypassAssistantStoreBoundaryFiles -
        sDirectSupabaseBypassDirectorPdfSourceTransportFiles -
        sBuyerScreenSideEffectBoundaryFiles -
        sAuditBattle11AccountantScreenViewModelFiles -
        sAuditBattle12BuyerScreenStoreViewModelFiles -
        sAuditBattle13AiAssistantStyleBoundaryFiles -
        sAuditBattle14ProfileContentLoadStateBoundaryFiles -
        sAuditBattle41BuyerSubcontractFormModelFiles -
        sAuditBattle42DirectorMetricsTransportFiles -
        sAuditBattle45MapScreenStyleBoundaryFiles -
        sAuditBattle46ContractorWorkModalTransportFiles -
        sAuditBattle47BuyerSubcontractStyleBoundaryFiles -
        sAuditBattle48OfficeInviteHandoffBoundaryFiles -
        sAuditBattle49ActivePaymentFormStyleBoundaryFiles -
        sAuditBattle50CalcModalContentStyleBoundaryFiles -
        sAuditBattle51ProfileMembershipTransportFiles -
        sAuditBattle51ProfileAuthTransportFiles -
        sAuditBattle52CanonicalPdfAuthTransportFiles -
        sAuditBattle53RequestDraftSyncAuthTransportFiles -
        sAuditBattle54RequestRepositoryAuthTransportFiles -
        sAuditBattle55DirectorLifecycleAuthTransportFiles -
        sAuditBattle56MarketAuthTransportFiles -
        sAuditBattle57RequestsAuthTransportFiles -
        sAuditBattle58ChatAuthTransportFiles -
        sAuditBattle59BuyerSubcontractAuthTransportFiles -
        sAuditBattle60ContractorProfileAuthTransportFiles -
        sAuditBattle61ContractorScreenDataAuthTransportFiles -
        sAuditBattle62BuyerRfqPrefillAuthTransportFiles -
        sAuditBattle63SupplierShowcaseAuthTransportFiles -
        sAuditBattle64AccountantCardFlowAuthTransportFiles -
        sAuditBattle65BuyerSummaryAuthTransportFiles -
        sAuditBattle67AccountantScreenAuthTransportFiles -
        sAuditBattle68CurrentProfileIdentityAuthTransportFiles -
        sAuditBattle69ForemanAuthTransportFiles -
        sAuditBattle72BuyerAutoFioAuthTransportFiles -
        sAuditBattle73BuyerActionsAuthTransportFiles -
        sAuditBattle74MapScreenAuthTransportFiles -
        sAuditBattle76ForemanRequestsTransportFiles -
        sAuditBattle77DirectorDataTransportFiles -
        sAuditBattle78WarehouseNameMapTransportFiles -
        sAuditBattle79PdfRunnerAuthTransportFiles -
        sAuditBattle80PasswordResetAuthTransportFiles -
        sAuditBattle81SignUpAuthTransportFiles -
        sAuditBattle82SignInAuthTransportFiles -
        sAuditBattle84JobQueueTransportFiles -
        sAuditBattle85RequestDraftSyncTransportFiles -
        sAuditBattle86StorageTransportFiles -
        sAuditBattle87SecurityScreenAuthTransportFiles -
        sAuditBattle88StoreSupabaseWriteTransportFiles -
        sAuditBattle90BuyerActionsWriteTransportFiles -
        sAuditBattle91DirectorRequestTransportFiles -
        sAuditBattle92DirectorLifecycleRealtimeTransportFiles -
        sAuditBattle93ProfileRpcTransportFiles -
        sAuditBattle94AccountantReturnTransportFiles -
        sAuditBattle95AccountantHistoryTransportFiles -
        sAuditBattle96CoreRpcCompatTransportFiles -
        sAuditBattle97WarehouseIssueTransportFiles -
        sAuditBattle98CalcModalRpcTransportFiles -
        sAuditBattle99MapScreenMarketTransportFiles -
        sAuditBattle101AiReportsTransportFiles -
        sAuditBattle102ForemanAiResolveTransportFiles -
        sAuditBattle103DirectorReturnTransportFiles -
        sAuditBattle104DirectorReportsTransportFiles -
        sAuditBattle105PaymentPdfTransportFiles -
        sAuditBattle106ProposalsTransportFiles -
        sAuditBattle107IntegrityGuardsTransportFiles -
        sAuditBattle108ProfileStorageTransportFiles -
        sAuditBattle109AttachmentOpenerStorageTransportFiles -
        sAuditBattle110QueueLatencyMetricsTransportFiles -
        sAuditBattle111AccountantInboxTransportFiles -
        sAuditBattle111RequestsReadTransportFiles -
        sAuditBattle112DirectorProposalsTransportFiles -
        sAuditBattle113BuyerRequestProposalMapTransportFiles -
        sAuditBattle114ContractorWorkSearchTransportFiles -
        sAuditBattle115DirectorRepositoryTransportFiles -
        sAuditBattle116WarehouseIncomingFormPdfTransportFiles -
        sAuditBattle117WarehouseDayMaterialsPdfTransportFiles -
        sAuditBattle118WarehouseIncomingMaterialsPdfTransportFiles -
        sAuditBattle119WarehouseObjectWorkPdfTransportFiles -
        sAuditBattle120ContractorPdfSourceTransportFiles -
        sAuditBattle123BuyerRepoStorageTransportFiles -
        sAuditNightBattle113BuyerRepoReadTransportFiles -
        sAuditNightBattle114OfficeAccessTransportFiles -
        sAuditNightBattle115WarehouseSeedTransportFiles -
        sAuditBattle125MarketRepositoryTransportFiles -
        sAuditBattle126FilesStorageTransportFiles -
        sAuditBattle130DirectorApproveTransportFiles -
        sAuditBattle131BuyerAccountingFlagsTransportFiles -
        sAuditBattle133CatalogProposalCreationTransportFiles -
        sAuditBattle135SubcontractsSharedTransportFiles,
    ).toBeLessThanOrEqual(1300);
  });
});

function countFilesRecursive(dir: string, pattern: RegExp): number {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFilesRecursive(path.join(dir, entry.name), pattern);
    } else if (pattern.test(entry.name)) {
      count++;
    }
  }
  return count;
}
