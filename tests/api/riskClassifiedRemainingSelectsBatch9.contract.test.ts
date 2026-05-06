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
    expect(identity).toContain(
      "CONSTRUCTION_OBJECT_IDENTITY_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }",
    );
    expect(identity).toContain(
      "normalizePage({ page: pageIndex }, CONSTRUCTION_OBJECT_IDENTITY_PAGE_DEFAULTS)",
    );
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
    expect(
      (identity.match(/\.range\(page\.from, page\.to\)/g) ?? []).length,
    ).toBe(2);
  });

  it("keeps excluded full-scan and sensitive surfaces untouched", () => {
    const forbiddenChanged = changedFiles().filter(
      (file) =>
        !isApprovedSLoadFix6WarehouseIssuePatch(file) &&
        !isApprovedLaterRpcValidationPatch(file) &&
        !isApprovedPdfInstantFirstOpenPatch(file) &&
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
