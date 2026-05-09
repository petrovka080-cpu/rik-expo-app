import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-BUYER-INBOX-LEGACY-API-WINDOW-CONTRACT-1", () => {
  it("routes legacy listBuyerInbox through a typed bounded scope contract", () => {
    const source = read("src/lib/api/buyer.ts");
    const transportSource = read("src/lib/api/_core.transport.ts");

    expect(source).toContain('from "./_core.transport"');
    expect(source).toContain("runUntypedRpcTransport");
    expect(source).toContain(
      'const BUYER_INBOX_LEGACY_SCOPE_RPC = "buyer_summary_inbox_scope_v1"',
    );
    expect(transportSource).toContain("runUntypedRpcTransport");
    expect(transportSource).toContain("runRpcCompatTransportVariant");
    expect(source).toContain("isBuyerInboxScopeRpcResponse");
    expect(source).toContain("loadBuyerInboxRowsFromScopeRpc");
    expect(source).toContain("p_offset: offsetGroups");
    expect(source).toContain(
      "p_limit: BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.pageSize",
    );
    expect(source).toContain("p_search: null");
    expect(source).toContain("p_company_id: null");
    expect(source).toContain("BUYER_INBOX_LEGACY_SCOPE_MAX_PAGES");
    expect(source).toContain("BuyerInboxLegacyWindowCeilingError");
    expect(source).not.toContain('client.rpc("list_buyer_inbox"');
    expect(source).not.toContain("client as unknown as BuyerInboxScopeRpcTransport");
  });

  it("keeps compatibility fallback bounded, ordered, and fail-closed", () => {
    const source = read("src/lib/api/buyer.ts");

    expect(source).toContain("BUYER_API_SAFE_LIST_PAGE_DEFAULTS");
    expect(source).toContain("maxRows: 5000");
    expect(source).toContain(
      "loadPagedRowsWithCeiling(queryFactory, BUYER_API_SAFE_LIST_PAGE_DEFAULTS)",
    );
    expect(source).toContain('.from("request_items")');
    expect(source).toContain('.order("created_at", { ascending: false })');
    expect(source).toContain('.order("id", { ascending: false })');
    expect(source).not.toContain(".limit(500)");
    expect(source).not.toContain(
      'client.from("request_items").select("*").limit',
    );
  });
});
