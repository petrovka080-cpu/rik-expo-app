import type { SupabaseClient } from "@supabase/supabase-js";

import type { PagedQuery } from "../../lib/api/_core";

export type WarehouseSeedRequestItemMini = {
  id?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  uom?: string | null;
};

export type WarehouseSeedPurchaseItemRow = {
  id?: string | null;
  request_item_id?: string | null;
  qty?: number | string | null;
  uom?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  request_items?: WarehouseSeedRequestItemMini | WarehouseSeedRequestItemMini[] | null;
};

export type WarehouseSeedProposalSnapshotRow = {
  request_item_id?: string | null;
  uom?: string | null;
  total_qty?: number | string | null;
};

export type WarehouseSeedPurchaseItemInsertRow = {
  purchase_id: string;
  request_item_id: string;
  qty: number;
  uom: string | null;
  name_human: string;
};

export type WarehouseSeedIncomingItemUpsertRow = {
  incoming_id: string;
  purchase_item_id: string;
  qty_expected: number;
  qty_received: number;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
};

export type WarehouseSeedEnsureRpcName =
  | "wh_incoming_ensure_items"
  | "ensure_incoming_items"
  | "wh_incoming_seed_from_purchase";

export function selectWarehouseSeedIncomingPurchaseId(
  supabase: SupabaseClient,
  incomingId: string,
) {
  return supabase
    .from("wh_incoming")
    .select("purchase_id")
    .eq("id", incomingId)
    .maybeSingle();
}

export function createWarehouseSeedPurchaseItemsQuery(
  supabase: SupabaseClient,
  purchaseId: string,
): PagedQuery<WarehouseSeedPurchaseItemRow> {
  return supabase
    .from("purchase_items")
    .select(
      `
      id,
      request_item_id,
      qty,
      uom,
      name_human,
      rik_code,
      request_items:request_items (
        rik_code,
        name_human,
        uom
      )
    `,
    )
    .eq("purchase_id", purchaseId)
    .order("id", { ascending: true }) as unknown as PagedQuery<WarehouseSeedPurchaseItemRow>;
}

export function selectWarehouseSeedPurchaseProposalId(
  supabase: SupabaseClient,
  purchaseId: string,
) {
  return supabase
    .from("purchases")
    .select("proposal_id")
    .eq("id", purchaseId)
    .maybeSingle();
}

export function createWarehouseSeedProposalSnapshotItemsQuery(
  supabase: SupabaseClient,
  proposalId: string,
): PagedQuery<WarehouseSeedProposalSnapshotRow> {
  return supabase
    .from("proposal_snapshot_items")
    .select("request_item_id, uom, total_qty")
    .eq("proposal_id", proposalId)
    .order("request_item_id", { ascending: true }) as unknown as PagedQuery<WarehouseSeedProposalSnapshotRow>;
}

export function createWarehouseSeedRequestItemsQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<WarehouseSeedRequestItemMini> {
  return supabase
    .from("request_items")
    .select("id, name_human, rik_code, uom")
    .in("id", requestItemIds)
    .order("id", { ascending: true }) as unknown as PagedQuery<WarehouseSeedRequestItemMini>;
}

export function insertWarehouseSeedPurchaseItems(
  supabase: SupabaseClient,
  rows: WarehouseSeedPurchaseItemInsertRow[],
) {
  return supabase.from("purchase_items").insert(rows);
}

export function upsertWarehouseSeedIncomingItems(
  supabase: SupabaseClient,
  rows: WarehouseSeedIncomingItemUpsertRow[],
) {
  return supabase.from("wh_incoming_items").upsert(rows, {
    onConflict: "incoming_id,purchase_item_id",
    ignoreDuplicates: false,
  });
}

export function selectWarehouseSeedIncomingItemProbe(
  supabase: SupabaseClient,
  incomingId: string,
) {
  return supabase
    .from("wh_incoming_items")
    .select("id")
    .eq("incoming_id", incomingId)
    .limit(1);
}

export function callWarehouseSeedEnsureRpc(
  supabase: SupabaseClient,
  fn: WarehouseSeedEnsureRpcName,
  incomingId: string,
) {
  return supabase.rpc(fn, { p_incoming_id: incomingId });
}
