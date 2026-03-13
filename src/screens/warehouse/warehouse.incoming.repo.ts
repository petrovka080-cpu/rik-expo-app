import { supabase } from "../../lib/supabaseClient";
import { withTimeout } from "./warehouse.utils";

export async function fetchWarehousePurchaseProposalLinks(purchaseIds: string[]) {
  return await withTimeout(
    supabase.from("purchases").select("id, proposal_id").in("id", purchaseIds),
    15000,
    "purchases->proposal_id",
  );
}

export async function fetchWarehouseProposalNos(proposalIds: string[]) {
  return await withTimeout(
    supabase.from("proposals").select("id, proposal_no").in("id", proposalIds),
    15000,
    "proposals->proposal_no",
  );
}

export async function fetchWarehouseIncomingHeadsPage(pageIndex: number, pageSize: number) {
  return await supabase
    .from("v_wh_incoming_heads_ui")
    .select("*")
    .order("purchase_created_at", { ascending: false })
    .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
}

export async function fetchWarehouseIncomingItems(incomingId: string) {
  return await supabase
    .from("v_wh_incoming_items_ui")
    .select("*")
    .eq("incoming_id", incomingId)
    .order("sort_key", { ascending: true });
}
