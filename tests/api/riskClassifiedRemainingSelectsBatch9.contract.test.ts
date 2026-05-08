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

const isApprovedDirectorReportsSafeRouting2Artifact = (file: string) =>
  [
    "artifacts/S_DIRECTOR_REPORTS_FETCHALL_SAFE_ROUTING_2_matrix.json",
    "artifacts/S_DIRECTOR_REPORTS_FETCHALL_SAFE_ROUTING_2_proof.md",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedDirectorReportsSafeBounds1Patch = (file: string) =>
  [
    "artifacts/S_DIRECTOR_REPORTS_FETCHALL_SAFE_BOUNDS_1_matrix.json",
    "artifacts/S_DIRECTOR_REPORTS_FETCHALL_SAFE_BOUNDS_1_proof.md",
    "src/lib/api/director_reports.naming.ts",
    "src/lib/api/director_reports.naming.fanout.test.ts",
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

describe("S-PAG-9 risk-classified remaining selects", () => {
  it("bounds six safe buyer and construction-object enrichment reads", () => {
    const buyer = read("src/lib/api/buyer.ts");
    expect(buyer).toContain("BUYER_API_SAFE_LIST_PAGE_DEFAULTS");
    expect(buyer).toContain("maxRows: 5000");
    expect(buyer).toContain("const loadPagedBuyerApiRows");
    expect(buyer).toContain(
      "loadPagedRowsWithCeiling(queryFactory, BUYER_API_SAFE_LIST_PAGE_DEFAULTS)",
    );
    expect(
      (buyer.match(/loadPagedBuyerApiRows</g) ?? []).length,
    ).toBeGreaterThanOrEqual(4);
    expect(buyer).toContain('.from("proposal_items_view")');
    expect(buyer).toContain('.order("request_item_id"');
    expect(buyer).toContain('.order("proposal_id"');
    expect(buyer).toContain('.from("v_proposals_summary")');
    expect(buyer).toContain('.from("proposal_items")');
    expect(buyer).toContain('.from("requests")');
    expect(
      (buyer.match(/\.range\(page\.from, page\.to\)/g) ?? []).length,
    ).toBeGreaterThanOrEqual(1);

    const identity = read("src/lib/api/constructionObjectIdentity.read.ts");
    expect(identity).toContain("CONSTRUCTION_OBJECT_IDENTITY_PAGE_DEFAULTS = {");
    expect(identity).toContain("maxRows: 5000");
    expect(identity).toContain("loadPagedRowsWithCeiling<TRow>");
    expect(identity).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
    expect(identity).toContain(
      '.from("construction_object_identity_lookup_v1")',
    );
    expect(identity).toContain(
      '.order("construction_object_name", { ascending: true })',
    );
    expect(identity).toContain(
      '.order("construction_object_code", { ascending: true })',
    );
    expect(identity).toContain('.from("request_object_identity_scope_v1")');
    expect(identity).toContain('.order("request_id", { ascending: true })');
    expect(identity).toContain("queryFactory().range(from, to)");
  });

  it("keeps excluded full-scan and sensitive surfaces untouched", () => {
    const forbiddenChanged = changedFiles().filter(
      (file) =>
        !isApprovedSLoadFix6WarehouseIssuePatch(file) &&
        !isApprovedLaterRpcValidationPatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
        !isApprovedDirectorReportsSafeRouting2Artifact(file) &&
        !isApprovedDirectorReportsSafeBounds1Patch(file) &&
        !isApprovedDirectSupabaseBypassBatch1Patch(file) &&
        !isApprovedAuditBattle52CanonicalPdfAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle79PdfRunnerAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle83DirectorPdfBackendAuthBoundaryPatch(file) &&
        !isApprovedAuditBattle101AiReportsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle104DirectorReportsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle105PaymentPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle106ProposalsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle107IntegrityGuardsTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle116WarehouseIncomingFormPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle117WarehouseDayMaterialsPdfTransportBoundaryPatch(file) &&
        !isApprovedAuditBattle118WarehouseIncomingMaterialsPdfTransportBoundaryPatch(file) &&
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|android\/|ios\/|supabase\/migrations\/|maestro\/)/.test(
          file,
        ) ||
          /(?:pdf|report|export|integrity\.guards|warehouse\.stock)/i.test(
            file,
          )),
    );
    expect(forbiddenChanged).toEqual([]);
  });

  it("records the S-PAG-9 proof artifact with counts and safety flags", () => {
    const matrix = JSON.parse(
      read("artifacts/S_PAG_9_risk_classified_remaining_selects_matrix.json"),
    );
    expect(matrix.wave).toBe("S-PAG-9");
    expect(matrix.baseline).toMatchObject({
      unboundedSelects: 80,
      unboundedFiles: 37,
    });
    expect(matrix.result).toMatchObject({
      unboundedSelects: 74,
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
