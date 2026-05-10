import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_DATA_01_QUERY_BOUNDS_TOP_30", () => {
  it("bounds assistant market by-id fallback reads with explicit page-through ceilings", () => {
    const source = read("src/features/ai/assistantActions.transport.ts");

    expect(source).toContain("ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS");
    expect(source).toContain("normalizeBoundedAssistantIds");
    expect(source).toContain(
      "loadPagedRowsWithCeiling<AssistantCompanyReadRow>",
    );
    expect(source).toContain(
      "loadPagedRowsWithCeiling<AssistantProfileReadRow>",
    );
    expect(source).toContain('.from("companies")');
    expect(source).toContain('.order("id", { ascending: true })');
    expect(source).toContain('.from("user_profiles")');
    expect(source).toContain('.order("user_id", { ascending: true })');
    expect(source).not.toContain(
      'const result = await supabase.from("companies").select("id,name").in("id", ids);',
    );
    expect(source).not.toContain(
      'const result = await supabase.from("user_profiles").select("user_id,full_name").in("user_id", ids);',
    );
  });

  it("classifies priority buyer, auction, and calc-field reads as bounded or single-scope", () => {
    const buyer = read("src/lib/api/buyer.ts");
    expect(buyer).toContain("BUYER_API_SAFE_LIST_PAGE_DEFAULTS");
    expect(buyer).toContain("loadPagedRowsWithCeiling(queryFactory, BUYER_API_SAFE_LIST_PAGE_DEFAULTS)");
    expect((buyer.match(/loadPagedBuyerApiRows</g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(buyer).toContain('.from("proposal_items_view")');
    expect(buyer).toContain('.from("v_proposals_summary")');
    expect(buyer).toContain('.from("proposal_items")');
    expect(buyer).toContain('.from("request_items")');
    expect(buyer).toContain(".range(page.from, page.to)");

    const auctions = read("src/features/auctions/auctions.data.ts");
    expect(auctions).toContain("AUCTION_CHILD_LIST_PAGE_DEFAULTS");
    expect(auctions).toContain("loadPagedAuctionRows");
    expect(auctions).toContain(".limit(AUCTION_LIST_PAGE_SIZE)");
    expect(auctions).toContain('.from("tender_items")');
    expect(auctions).toContain('.order("tender_id", { ascending: true })');
    expect(auctions).toContain(".maybeSingle()");

    const calcFields = read("src/components/foreman/useCalcFields.ts");
    expect(calcFields).toContain("CALC_FIELDS_PAGE_DEFAULTS");
    expect(calcFields).toContain("loadPagedRowsWithCeiling<Record<string, unknown>>");
    expect(calcFields).toContain('.order("sort_order", { ascending: true })');
    expect(calcFields).toContain('.order("basis_key",');
    expect(calcFields).toContain('.select("family_code")');
    expect(calcFields).toContain(".maybeSingle()");
  });

  it("records exactly 30 selected query call sites and reduces the unresolved audit bucket", () => {
    const inventory = JSON.parse(
      read("artifacts/S_DATA_01_QUERY_BOUNDS_TOP_30_inventory_delta.json"),
    );

    expect(inventory.wave).toBe("S_DATA_01_QUERY_BOUNDS_TOP_30");
    expect(inventory.baseline.potentiallyUnboundedSelects).toBe(92);
    expect(inventory.selection.selectedCount).toBe(30);
    expect(inventory.result.resolvedTop30Count).toBe(30);
    expect(inventory.result.fixedCallSites).toBe(2);
    expect(inventory.result.classifiedCallSites).toBe(28);
    expect(inventory.result.remainingUnresolvedPotentiallyUnboundedSelects).toBe(62);
    expect(inventory.entries).toHaveLength(30);
    expect(
      inventory.entries.every((entry: { status: string }) =>
        ["fixed", "classified"].includes(entry.status),
      ),
    ).toBe(true);
  });

  it("keeps proposal/request item broad reads behind existing page-through helpers", () => {
    const requestCanonical = read("src/lib/api/requestCanonical.read.ts");
    expect(requestCanonical).toContain("loadCanonicalRequestItemCountsByRequestIds");
    expect(requestCanonical).toContain("loadCanonicalRequestsByIds");
    expect(requestCanonical).toContain("loadCanonicalRequestItemsByRequestId");
    expect(requestCanonical).toContain("CANONICAL_REQUEST_REFERENCE_PAGE_DEFAULTS");
    expect((requestCanonical.match(/loadPagedRowsWithCeiling<UnknownRow>/g) ?? []).length).toBeGreaterThanOrEqual(3);

    const proposalAttachments = read("src/lib/api/proposalAttachments.service.ts");
    expect(proposalAttachments).toContain("loadCompatibilityRows");
    expect(proposalAttachments).toContain("PROPOSAL_ATTACHMENT_COMPATIBILITY_PAGE_DEFAULTS");
    expect(proposalAttachments).toContain("loadPagedRowsWithCeiling<ProposalAttachmentTableRow>");

    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain("selectProposalItemsSnapshot");
    expect(proposals).toContain("selectProposalItemsView");
    expect(proposals).toContain("selectProposalItemsTable");
    expect(proposals).toContain("PROPOSAL_REFERENCE_PAGE_DEFAULTS");
    expect((proposals.match(/loadPagedRowsWithCeiling<Proposal/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
