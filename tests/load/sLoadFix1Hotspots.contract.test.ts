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

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
    "src/screens/warehouse/warehouse.stockReports.service.ts",
  ].includes(file.replace(/\\/g, "/"));

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
    const forbidden = changed.filter(
      (file) =>
        !isLaterApprovedWarehouseIssueSourcePatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
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
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|ios\/|android\/|supabase\/migrations\/|maestro\/|node_modules\/|android\/app\/build\/)/.test(
          file.replace(/\\/g, "/"),
        ) ||
          /\.(?:apk|aab)$/i.test(file) ||
          /(?:pdf|report|export|detail)/i.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
