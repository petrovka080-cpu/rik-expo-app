import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createGuardedPagedQuery,
  isRecordRow,
  type PagedQuery,
} from "../../lib/api/_core";

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

const isOptionalString = (value: unknown): boolean =>
  value == null || typeof value === "string";

const isOptionalNumberOrString = (value: unknown): boolean =>
  value == null || typeof value === "number" || typeof value === "string";

export const isWarehouseSeedRequestItemMini = (
  value: unknown,
): value is WarehouseSeedRequestItemMini =>
  isRecordRow(value) &&
  isOptionalString(value.id) &&
  isOptionalString(value.name_human) &&
  isOptionalString(value.rik_code) &&
  isOptionalString(value.uom);

const isWarehouseSeedRequestItemsRelation = (
  value: unknown,
): value is WarehouseSeedRequestItemMini | WarehouseSeedRequestItemMini[] | null | undefined =>
  value == null ||
  isWarehouseSeedRequestItemMini(value) ||
  (Array.isArray(value) && value.every(isWarehouseSeedRequestItemMini));

export const isWarehouseSeedPurchaseItemRow = (
  value: unknown,
): value is WarehouseSeedPurchaseItemRow =>
  isRecordRow(value) &&
  isOptionalString(value.id) &&
  isOptionalString(value.request_item_id) &&
  isOptionalNumberOrString(value.qty) &&
  isOptionalString(value.uom) &&
  isOptionalString(value.name_human) &&
  isOptionalString(value.rik_code) &&
  isWarehouseSeedRequestItemsRelation(value.request_items);

export const isWarehouseSeedProposalSnapshotRow = (
  value: unknown,
): value is WarehouseSeedProposalSnapshotRow =>
  isRecordRow(value) &&
  isOptionalString(value.request_item_id) &&
  isOptionalString(value.uom) &&
  isOptionalNumberOrString(value.total_qty);

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
  return createGuardedPagedQuery(
    supabase
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
      .order("id", { ascending: true }),
    isWarehouseSeedPurchaseItemRow,
    "warehouse.seed.purchase_items",
  );
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
  return createGuardedPagedQuery(
    supabase
      .from("proposal_snapshot_items")
      .select("request_item_id, uom, total_qty")
      .eq("proposal_id", proposalId)
      .order("request_item_id", { ascending: true }),
    isWarehouseSeedProposalSnapshotRow,
    "warehouse.seed.proposal_snapshot_items",
  );
}

export function createWarehouseSeedRequestItemsQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<WarehouseSeedRequestItemMini> {
  return createGuardedPagedQuery(
    supabase
      .from("request_items")
      .select("id, name_human, rik_code, uom")
      .in("id", requestItemIds)
      .order("id", { ascending: true }),
    isWarehouseSeedRequestItemMini,
    "warehouse.seed.request_items",
  );
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
