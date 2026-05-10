import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_NIGHT_DATA_02_BUYER_TS_UNBOUNDED_SELECTS_REAL_FIX_BATCH_A", () => {
  it("replaces buyer wildcard selects with explicit read contracts", () => {
    const source = read("src/lib/api/buyer.ts");

    expect(source).not.toContain('.select("*")');
    expect(source).toContain(".select(BUYER_PROPOSAL_ITEMS_VIEW_SELECT)");
    expect(source).toContain(".select(BUYER_PROPOSAL_LIFECYCLE_SELECT)");
    expect(source).toContain(".select(BUYER_REJECT_CONTEXT_SELECT)");
    expect(source).toContain(".select(BUYER_REQUEST_STATUS_SELECT)");
    expect(source).toContain(
      ".select(BUYER_REQUEST_ITEMS_FALLBACK_SELECT_WITH_REQUEST_STATUS)",
    );
  });

  it("bounds buyer id fanout by the same ceiling as paged read-through", () => {
    const source = read("src/lib/api/buyer.ts");

    expect(source).toContain(
      "const BUYER_API_INPUT_ID_MAX = BUYER_API_SAFE_LIST_PAGE_DEFAULTS.maxRows",
    );
    expect(source).toContain("class BuyerApiInputIdCeilingError extends Error");
    expect(source).toContain("normalizeBuyerApiInputIds(");
    expect(source).toContain(
      '"loadLatestProposalLifecycleByRequestItem.requestItemIds"',
    );
    expect(source).toContain(
      '"loadLatestProposalLifecycleByRequestItem.proposalIds"',
    );
    expect(source).toContain('"enrichRejectedRows.rejectedRequestItemIds"');
    expect(source).toContain('"filterInboxByRequestStatus.requestIds"');
  });
});
