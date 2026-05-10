import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

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
        !isLaterApprovedRpcValidationPatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
        !isApprovedDirectSupabaseBypassBatch1Patch(file) &&
        !isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle86StorageTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle101AiReportsTransportBoundaryPatch(file) &&
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
        !isApprovedAuditNightBattle131AndroidRuntimeLoopBoundaryPatch(file) &&
        !isApprovedNightUi13DirectorReportsModalStyleBoundaryPatch(file) &&
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
