import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [
    sLoadFix6WarehouseIssueExplainPatch,
    "src/screens/warehouse/warehouse.stockReports.service.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedLaterRpcValidationPatch = (file: string) =>
  ["src/lib/api/integrity.guards.ts"].includes(file.replace(/\\/g, "/"));

const isApprovedPdfInstantFirstOpenPatch = (file: string) =>
  [
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
    "tests/pdf/pdfDocumentActionsDecompositionAudit.test.ts",
    "tests/pdf/pdfOpenLatencyAudit.test.ts",
    "tests/pdf/pdfViewer.handoffPlan.test.ts",
    "tests/pdf/pdfViewer.readiness.test.ts",
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

const isApprovedAuditBattle86StorageTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/storage.ts",
    "src/lib/api/storage.service.test.ts",
    "src/lib/api/storage.transport.ts",
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

const isApprovedAuditBattle106ProposalsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/proposals.ts",
    "src/lib/api/proposals.transport.ts",
    "tests/api/proposalsTransportBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle107IntegrityGuardsTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/api/integrity.guards.ts",
    "src/lib/api/integrity.guards.transport.ts",
    "tests/api/integrityGuardsTransportBoundary.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle108ProfileStorageTransportBoundaryPatch = (file: string) =>
  ["src/screens/profile/profile.storage.transport.ts"].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle109AttachmentOpenerStorageTransportBoundaryPatch = (file: string) =>
  ["src/lib/documents/attachmentOpener.storage.transport.ts"].includes(file.replace(/\\/g, "/"));

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

const isApprovedAuditBattle123BuyerRepoStorageTransportBoundaryPatch = (file: string) =>
  [
    "src/screens/buyer/buyer.repo.ts",
    "src/screens/buyer/buyer.repo.storage.transport.ts",
    "tests/api/buyerRepoStorageTransport.contract.test.ts",
    "tests/perf/performance-budget.test.ts",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAuditBattle127SupplierFilesMetadataTransportBoundaryPatch = (file: string) =>
  [
    "src/lib/files.ts",
    "src/lib/files.storage.transport.ts",
    "tests/api/supplierFilesStorageTransport.contract.test.ts",
  ].includes(file.replace(/\\/g, "/"));

describe("S-PAG-8 remaining safe list pagination", () => {
  it("bounds six safe remaining list and enrichment reads", () => {
    const auctions = read("src/features/auctions/auctions.data.ts");
    expect(auctions).toContain("AUCTION_CHILD_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }");
    expect(auctions).toContain("async function loadPagedAuctionRows");
    expect(auctions).toContain("loadPagedRowsWithCeiling(queryFactory, AUCTION_CHILD_LIST_PAGE_DEFAULTS)");
    expect(auctions).toContain(".from(\"tender_items\")");
    expect(auctions).toContain(".order(\"tender_id\", { ascending: true })");
    expect(auctions).toContain(".order(\"created_at\", { ascending: true })");
    expect(auctions).toContain(".order(\"id\", { ascending: true })");
    expect(auctions).toContain("maxRows: 5000");

    const proposalNos = read("src/screens/buyer/hooks/useBuyerProposalNos.ts");
    expect(proposalNos).toContain("BUYER_PROPOSAL_NOS_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(proposalNos).toContain("normalizePage({ page: pageIndex }, BUYER_PROPOSAL_NOS_PAGE_DEFAULTS)");
    expect(proposalNos).toContain(".order(\"id\", { ascending: true })");
    expect(proposalNos).toContain(".range(page.from, page.to)");

    const buyerBuckets = read("src/screens/buyer/buyer.buckets.repo.ts");
    expect(buyerBuckets).toContain("fetchBuyerProposalItemIds");
    expect(buyerBuckets).toContain("normalizePage({ page: pageIndex }, { pageSize: 100, maxPageSize: 100 })");
    expect(buyerBuckets).toContain(".order(\"proposal_id\", { ascending: true })");
    expect(buyerBuckets).toContain(".order(\"request_item_id\", { ascending: true })");
    expect(buyerBuckets).toContain(".range(page.from, page.to)");

    const chatApi = read("src/lib/assistant_store_read.low_risk.transport.ts");
    expect(chatApi).toContain("const profilePage = normalizePage(");
    expect(chatApi).toContain(".order(\"user_id\", { ascending: true })");
    expect(chatApi).toContain(".range(profilePage.from, profilePage.to)");

    const officeAccess = read("src/screens/office/officeAccess.services.ts");
    expect(officeAccess).toContain("const profilePage = normalizePage(");
    expect(officeAccess).toContain(".order(\"user_id\", { ascending: true })");
    expect(officeAccess).toContain(".range(profilePage.from, profilePage.to)");

    const warehouseNameMap = read("src/screens/warehouse/warehouse.nameMap.ui.ts");
    const warehouseNameMapTransport = read("src/screens/warehouse/warehouse.nameMap.ui.transport.ts");
    expect(warehouseNameMap).toContain("WAREHOUSE_NAME_MAP_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }");
    expect(warehouseNameMap).toContain("loadPagedRowsWithCeiling<WarehouseNameMapUiRow>");
    expect(warehouseNameMap).toContain("createWarehouseNameMapUiQuery");
    expect(warehouseNameMapTransport).toContain(".order(\"code\", { ascending: true })");
    expect(warehouseNameMap).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
    expect(warehouseNameMap).not.toContain("codes.slice(0, 5000)");
  });

  it("keeps detail, report, guard, storage, SQL, native, and package surfaces untouched", () => {
    const auctions = read("src/features/auctions/auctions.data.ts");
    const detailStart = auctions.indexOf("export async function loadAuctionDetail");
    const detailEnd = auctions.indexOf("export function buildAuctionAssistantPrompt");
    expect(auctions.slice(detailStart, detailEnd)).toContain("loadPagedAuctionRows");

    const forbiddenChanged = changedFiles().filter((file) =>
      !isApprovedSLoadFix6WarehouseIssuePatch(file) &&
      !isApprovedLaterRpcValidationPatch(file) &&
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
      !isApprovedAuditBattle127SupplierFilesMetadataTransportBoundaryPatch(file) &&
      (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|android\/|ios\/|supabase\/migrations\/|maestro\/)/.test(file) ||
        /(?:pdf|report|export|integrity\.guards|storage)/i.test(file)),
    );
    expect(forbiddenChanged).toEqual([]);
  });

  it("records the S-PAG-8 proof artifact with counts and safety flags", () => {
    const matrix = JSON.parse(read("artifacts/S_PAG_8_remaining_safe_list_pagination_matrix.json"));
    expect(matrix.wave).toBe("S-PAG-8");
    expect(matrix.baseline).toMatchObject({
      unboundedSelects: 86,
      unboundedFiles: 37,
    });
    expect(matrix.result).toMatchObject({
      unboundedSelects: 80,
      unboundedFiles: 37,
      fixedCallSites: 6,
      targetMet: true,
    });
    expect(matrix.safety).toMatchObject({
      productionTouched: false,
      stagingTouched: false,
      writes: false,
      sqlRpcRlsStorageChanged: false,
      packageNativeChanged: false,
      businessLogicChanged: false,
      otaEasPlayMarketTouched: false,
      secretsPrintedOrCommitted: false,
    });
  });
});
