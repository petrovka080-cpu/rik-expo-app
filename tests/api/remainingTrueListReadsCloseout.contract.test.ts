import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");

const read = (...parts: string[]) => readFileSync(path.join(repoRoot, ...parts), "utf8");

describe("S-PAG-17 remaining true list reads closeout", () => {
  it("bounds proposal attachment compatibility fallback without touching canonical rpc semantics", () => {
    const source = read("src", "lib", "api", "proposalAttachments.service.ts");

    expect(source).toContain("PROPOSAL_ATTACHMENT_COMPATIBILITY_PAGE_DEFAULTS");
    expect(source).toContain("loadPagedRowsWithCeiling<ProposalAttachmentTableRow>");
    expect(source).toContain(".from(\"proposal_attachments\")");
    expect(source).toContain(".order(\"created_at\", { ascending: false })");
    expect(source).toContain(".order(\"id\", { ascending: false })");
    expect(source).toContain("proposal_attachment_evidence_scope_v1");
  });

  it("bounds canonical request id fanout while preserving request item count pagination", () => {
    const source = read("src", "lib", "api", "requestCanonical.read.ts");

    expect(source).toContain("loadPagedRowsWithCeiling<UnknownRow>");
    expect(source).toContain(".from(\"requests\")");
    expect(source).toContain(".select(selectedColumns.join(\",\"))");
    expect(source).toContain(".in(\"id\", missingIds)");
    expect(source).toContain(".order(\"id\", { ascending: true })");
    expect(source).toContain("loadCanonicalRequestItemCountsByRequestIds");
  });

  it("bounds contractor works enrichment fanout for progress, purchase, request, and subcontract lookups", () => {
    const source = read("src", "screens", "contractor", "contractor.loadWorksService.ts");

    expect(source).toContain("loadPagedRowsWithCeiling<WorkProgressRawRow>");
    expect(source).toContain(".from(\"work_progress\")");
    expect(source).toContain(".select(\"id, purchase_item_id, object_id\")");
    expect(source).toContain(".order(\"id\", { ascending: true })");
    expect(source).toContain("loadPagedRowsWithCeiling<PurchaseItemRawRow>");
    expect(source).toContain("loadPagedRowsWithCeiling<RequestItemRawRow>");
    expect(source).toContain("loadPagedRowsWithCeiling<SubcontractObjectRawRow>");
  });

  it("bounds contractor work-modal issued-data fanout with stable request and issue ordering", () => {
    const source = read("src", "screens", "contractor", "contractor.workModalService.ts");

    expect(source).toContain("loadPagedRowsWithCeiling<RequestDisplayRow>");
    expect(source).toContain("loadPagedRowsWithCeiling<WarehouseIssueHeadRow>");
    expect(source).toContain("loadPagedRowsWithCeiling<IssueReqHeadUiRow>");
    expect(source).toContain("loadPagedRowsWithCeiling<IssueReqItemUiRow>");
    expect(source).toContain(".order(\"request_id\", { ascending: true })");
    expect(source).toContain(".order(\"request_item_id\", { ascending: true })");
  });

  it("bounds director proposal request-id preload without changing point lookup display preload", () => {
    const source = read("src", "screens", "director", "director.data.ts");

    expect(source).toContain("loadPagedRowsWithCeiling<{ id?: string | number | null; request_id?: string | number | null }>");
    expect(source).toContain(".from(\"request_items\")");
    expect(source).toContain(".select(\"id, request_id\")");
    expect(source).toContain(".in(\"id\", ids)");
    expect(source).toContain(".order(\"id\", { ascending: true })");
    expect(source).toContain("preloadDisplayNos");
  });

  it("bounds foreman linked-request list reads and leaves display-label point lookup as maybeSingle", () => {
    const source = read("src", "screens", "foreman", "foreman.requests.ts");

    expect(source).toContain("FOREMAN_REQUEST_LINK_PAGE_DEFAULTS");
    expect(source).toContain("loadPagedRowsWithCeiling<LinkedRequestSummaryRow>");
    expect(source).toContain(".eq(\"subcontract_id\", normalized)");
    expect(source).toContain(".eq(\"contractor_job_id\", normalized)");
    expect(source).toContain(".order(\"created_at\", { ascending: false })");
    expect(source).toContain(".order(\"id\", { ascending: true })");
    expect(source).toContain(".maybeSingle<RequestDisplayRow>()");
  });
});
