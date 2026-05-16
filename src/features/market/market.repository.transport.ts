import type { Database } from "../../lib/database.types";
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

export type MarketProposalHeadPatch = Database["public"]["Tables"]["proposals"]["Update"];

export type MarketSupplierMessageInsert = {
  supplier_id: string | null;
  supplier_user_id: string | null;
  marketplace_item_id: string;
  message: string;
};

export async function callMarketplaceItemsScopePageRpc(args: MarketItemsScopePageRpcArgs) {
  return await supabase.rpc("marketplace_items_scope_page_v1" as never, {
    p_offset: args.p_offset,
    p_limit: args.p_limit,
    p_side: args.p_side,
    p_kind: args.p_kind,
  } as never);
}

export async function callMarketplaceItemScopeDetailRpc(args: MarketItemScopeDetailRpcArgs) {
  return await supabase
    .rpc("marketplace_item_scope_detail_v1" as never, args as never)
    .maybeSingle();
}

export async function updateMarketplaceProposalHead(proposalId: string, patch: MarketProposalHeadPatch) {
  return await supabase.from("proposals").update(patch).eq("id", proposalId);
}

export async function insertMarketplaceSupplierMessage(payload: MarketSupplierMessageInsert) {
  return await supabase.from("supplier_messages" as never).insert(payload as never).select("id").single();
}
