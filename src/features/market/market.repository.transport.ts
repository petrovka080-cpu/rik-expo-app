import { supabase } from "../../lib/supabaseClient";

export type MarketItemsScopePageRpcArgs = {
  p_offset: number;
  p_limit: number;
  p_side: string | null;
  p_kind: string | null;
};

export type MarketItemScopeDetailRpcArgs = {
  p_listing_id: string;
};

export async function callMarketplaceItemsScopePageRpc(args: MarketItemsScopePageRpcArgs) {
  return await supabase.rpc("marketplace_items_scope_page_v1" as never, args as never);
}

export async function callMarketplaceItemScopeDetailRpc(args: MarketItemScopeDetailRpcArgs) {
  return await supabase
    .rpc("marketplace_item_scope_detail_v1" as never, args as never)
    .maybeSingle();
}
