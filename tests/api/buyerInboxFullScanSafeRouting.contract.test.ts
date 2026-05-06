import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-BUYER-INBOX-FULL-SCAN-SAFE-ROUTING-1 contract", () => {
  it("keeps buyer inbox full scan on the typed RPC window contract with ceilings", () => {
    const source = read("src/screens/buyer/buyer.fetchers.ts");

    expect(source).toContain("BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE");
    expect(source).toContain("BUYER_INBOX_FULL_SCAN_MAX_GROUPS");
    expect(source).toContain("BUYER_INBOX_FULL_SCAN_MAX_PAGES");
    expect(source).toContain("runContainedRpc(");
    expect(source).toContain('"buyer_summary_inbox_scope_v1"');
    expect(source).toContain("p_offset: normalizedOffsetGroups");
    expect(source).toContain("p_limit: normalizedLimitGroups");
    expect(source).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(source).toContain("buildBuyerInboxFullScanGroupCeilingError");
    expect(source).toContain("buildBuyerInboxFullScanPageCeilingError");
    expect(source).not.toContain("while (true)");
    expect(source).not.toContain("listBuyerInbox?.()");
  });
});
