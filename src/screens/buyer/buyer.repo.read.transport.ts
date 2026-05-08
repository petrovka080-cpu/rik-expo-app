import type { SupabaseClient } from "@supabase/supabase-js";

import type { PagedQuery } from "../../lib/api/_core";
import type { Database } from "../../lib/database.types";

type ProposalItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type RequestItemRow = Database["public"]["Tables"]["request_items"]["Row"];
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export type BuyerProposalAccountingItemRow = Pick<
  ProposalItemRow,
  "supplier" | "qty" | "price"
>;

export type BuyerSupplierCardRow = Pick<
  SupplierRow,
  "name" | "inn" | "bank_account" | "phone" | "email"
>;

export type BuyerProposalItemViewRow = Pick<
  ProposalItemRow,
  | "request_item_id"
  | "name_human"
  | "uom"
  | "qty"
  | "rik_code"
  | "app_code"
  | "price"
  | "supplier"
  | "note"
>;

export type BuyerRequestItemRow = Pick<
  RequestItemRow,
  | "id"
  | "name_human"
  | "uom"
  | "qty"
  | "rik_code"
  | "app_code"
  | "status"
  | "cancelled_at"
>;

export type BuyerProposalItemLinkRow = Pick<
  ProposalItemRow,
  "proposal_id" | "request_item_id"
>;

export type BuyerRequestItemToRequestRow = Pick<RequestItemRow, "id" | "request_id">;

export function createBuyerProposalItemsForAccountingQuery(
  supabase: SupabaseClient,
  proposalId: string,
): PagedQuery<BuyerProposalAccountingItemRow> {
  return supabase
    .from("proposal_items")
    .select("supplier, qty, price")
    .eq("proposal_id", proposalId)
    .order("id", { ascending: true }) as unknown as PagedQuery<BuyerProposalAccountingItemRow>;
}

export function selectBuyerSupplierCardByName(
  supabase: SupabaseClient,
  supplierName: string,
) {
  return supabase
    .from("suppliers")
    .select("name, inn, bank_account, phone, email")
    .ilike("name", supplierName)
    .maybeSingle<BuyerSupplierCardRow>();
}

export function createBuyerProposalItemsForViewQuery(
  supabase: SupabaseClient,
  proposalId: string,
): PagedQuery<BuyerProposalItemViewRow> {
  return supabase
    .from("proposal_items")
    .select("request_item_id, name_human, uom, qty, rik_code, app_code, price, supplier, note")
    .eq("proposal_id", proposalId)
    .order("request_item_id", { ascending: true }) as unknown as PagedQuery<BuyerProposalItemViewRow>;
}

export function createBuyerRequestItemsByIdsQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<BuyerRequestItemRow> {
  return supabase
    .from("request_items")
    .select("id, name_human, uom, qty, rik_code, app_code, status, cancelled_at")
    .in("id", requestItemIds)
    .order("id", { ascending: true }) as unknown as PagedQuery<BuyerRequestItemRow>;
}

export function createBuyerProposalItemLinksQuery(
  supabase: SupabaseClient,
  proposalIds: string[],
): PagedQuery<BuyerProposalItemLinkRow> {
  return supabase
    .from("proposal_items")
    .select("proposal_id, request_item_id")
    .in("proposal_id", proposalIds)
    .order("proposal_id", { ascending: true })
    .order("request_item_id", { ascending: true }) as unknown as PagedQuery<BuyerProposalItemLinkRow>;
}

export function createBuyerRequestItemToRequestMapQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<BuyerRequestItemToRequestRow> {
  return supabase
    .from("request_items")
    .select("id, request_id")
    .in("id", requestItemIds)
    .order("id", { ascending: true }) as unknown as PagedQuery<BuyerRequestItemToRequestRow>;
}
