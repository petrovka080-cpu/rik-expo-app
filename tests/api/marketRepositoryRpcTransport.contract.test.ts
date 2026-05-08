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
    expect(repositorySource).not.toContain('from "../../lib/supabaseClient"');
    expect(repositorySource).not.toContain("supabase.");
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

  it("keeps marketplace write provider calls behind the typed transport without moving service contracts", () => {
    const repositorySource = read("src/features/market/market.repository.ts");
    const transportSource = read("src/features/market/market.repository.transport.ts");

    expect(repositorySource).toContain("type MarketProposalHeadPatch");
    expect(repositorySource).toContain("const headPatch: MarketProposalHeadPatch = {");
    expect(repositorySource).toContain("if (buyerFio) headPatch.buyer_fio = buyerFio;");
    expect(repositorySource).toContain("const patchResult = await updateMarketplaceProposalHead(proposalId, headPatch);");
    expect(repositorySource).toContain("if (patchResult.error) throw patchResult.error;");
    expect(repositorySource).toContain("const message = trim(params.message);");
    expect(repositorySource).toContain("if (!message) {");
    expect(repositorySource).toContain("if (!supplierId && !supplierUserId) {");
    expect(repositorySource).toContain("const result = await insertMarketplaceSupplierMessage({");
    expect(repositorySource).toContain("const messageId = trim((result.data as { id?: string | null } | null)?.id);");
    expect(repositorySource).toContain("if (!messageId) throw new Error(");
    expect(repositorySource).not.toContain('supabase.from("proposals")');
    expect(repositorySource).not.toContain('from("supplier_messages"');

    expect(transportSource).toContain("export type MarketProposalHeadPatch");
    expect(transportSource).toContain("export type MarketSupplierMessageInsert");
    expect(transportSource).toContain("updateMarketplaceProposalHead");
    expect(transportSource).toContain('supabase.from("proposals").update(patch).eq("id", proposalId)');
    expect(transportSource).toContain("insertMarketplaceSupplierMessage");
    expect(transportSource).toContain(
      'supabase.from("supplier_messages" as never).insert(payload as never).select("id").single()',
    );
    expect(transportSource).not.toContain("beginPlatformObservability");
    expect(transportSource).not.toContain("validateRpcResponse");
  });
});
