import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("market repository RPC transport boundary", () => {
  it("keeps marketplace read RPC provider calls behind the typed transport", () => {
    const repositorySource = read("src/features/market/market.repository.ts");
    const transportSource = read("src/features/market/market.repository.transport.ts");

    expect(repositorySource).toContain('from "./market.repository.transport"');
    expect(repositorySource).toContain("callMarketplaceItemsScopePageRpc({");
    expect(repositorySource).toContain("callMarketplaceItemScopeDetailRpc({ p_listing_id: listingId })");
    expect(repositorySource).not.toContain('supabase.rpc(\n      "marketplace_items_scope_page_v1"');
    expect(repositorySource).not.toContain('.rpc("marketplace_item_scope_detail_v1"');

    expect(repositorySource).toContain("validateRpcResponse(rowsResult.data");
    expect(repositorySource).toContain("validateRpcResponse(rawData");
    expect(repositorySource).toContain('rpcName: "marketplace_items_scope_page_v1"');
    expect(repositorySource).toContain('rpcName: "marketplace_item_scope_detail_v1"');
    expect(repositorySource).toContain("toMarketHomeListingCardFromScope");

    expect(transportSource).toContain("export type MarketItemsScopePageRpcArgs");
    expect(transportSource).toContain("export type MarketItemScopeDetailRpcArgs");
    expect(transportSource).toContain("callMarketplaceItemsScopePageRpc");
    expect(transportSource).toContain("callMarketplaceItemScopeDetailRpc");
    expect(transportSource).toContain('supabase.rpc("marketplace_items_scope_page_v1"');
    expect(transportSource).toContain('rpc("marketplace_item_scope_detail_v1"');
    expect(transportSource).toContain(".maybeSingle()");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("toMarketHomeListingCardFromScope");
  });
});
