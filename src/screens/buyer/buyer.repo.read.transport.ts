import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createGuardedPagedQuery,
  isRecordRow,
  type PagedQuery,
  type PagedQueryProvider,
  type PagedQueryRowGuard,
} from "../../lib/api/_core";
import type { Database } from "../../lib/database.types";

export { createGuardedPagedQuery, isRecordRow };
export type { PagedQueryProvider, PagedQueryRowGuard };

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

const hasNullableStringField = (
  row: Record<string, unknown>,
  field: string,
): boolean => row[field] == null || typeof row[field] === "string";

const hasNullableNumberField = (
  row: Record<string, unknown>,
  field: string,
): boolean => row[field] == null || typeof row[field] === "number";

export const isBuyerProposalAccountingItemRow = (
  value: unknown,
): value is BuyerProposalAccountingItemRow =>
  isRecordRow(value) &&
  hasNullableStringField(value, "supplier") &&
  hasNullableNumberField(value, "qty") &&
  hasNullableNumberField(value, "price");

export const isBuyerProposalItemViewRow = (
  value: unknown,
): value is BuyerProposalItemViewRow =>
  isRecordRow(value) &&
  hasNullableStringField(value, "request_item_id") &&
  hasNullableStringField(value, "name_human") &&
  hasNullableStringField(value, "uom") &&
  hasNullableNumberField(value, "qty") &&
  hasNullableStringField(value, "rik_code") &&
  hasNullableStringField(value, "app_code") &&
  hasNullableNumberField(value, "price") &&
  hasNullableStringField(value, "supplier") &&
  hasNullableStringField(value, "note");

export const isBuyerRequestItemRow = (
  value: unknown,
): value is BuyerRequestItemRow =>
  isRecordRow(value) &&
  hasNullableStringField(value, "id") &&
  hasNullableStringField(value, "name_human") &&
  hasNullableStringField(value, "uom") &&
  hasNullableNumberField(value, "qty") &&
  hasNullableStringField(value, "rik_code") &&
  hasNullableStringField(value, "app_code") &&
  hasNullableStringField(value, "status") &&
  hasNullableStringField(value, "cancelled_at");

export const isBuyerProposalItemLinkRow = (
  value: unknown,
): value is BuyerProposalItemLinkRow =>
  isRecordRow(value) &&
  hasNullableStringField(value, "proposal_id") &&
  hasNullableStringField(value, "request_item_id");

export const isBuyerRequestItemToRequestRow = (
  value: unknown,
): value is BuyerRequestItemToRequestRow =>
  isRecordRow(value) &&
  hasNullableStringField(value, "id") &&
  hasNullableStringField(value, "request_id");

export function createBuyerProposalItemsForAccountingQuery(
  supabase: SupabaseClient,
  proposalId: string,
): PagedQuery<BuyerProposalAccountingItemRow> {
  return createGuardedPagedQuery(
    supabase
      .from("proposal_items")
      .select("supplier, qty, price")
      .eq("proposal_id", proposalId)
      .order("id", { ascending: true }),
    isBuyerProposalAccountingItemRow,
    "createBuyerProposalItemsForAccountingQuery",
  );
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
  return createGuardedPagedQuery(
    supabase
      .from("proposal_items")
      .select("request_item_id, name_human, uom, qty, rik_code, app_code, price, supplier, note")
      .eq("proposal_id", proposalId)
      .order("request_item_id", { ascending: true }),
    isBuyerProposalItemViewRow,
    "createBuyerProposalItemsForViewQuery",
  );
}

export function createBuyerRequestItemsByIdsQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<BuyerRequestItemRow> {
  return createGuardedPagedQuery(
    supabase
      .from("request_items")
      .select("id, name_human, uom, qty, rik_code, app_code, status, cancelled_at")
      .in("id", requestItemIds)
      .order("id", { ascending: true }),
    isBuyerRequestItemRow,
    "createBuyerRequestItemsByIdsQuery",
  );
}

export function createBuyerProposalItemLinksQuery(
  supabase: SupabaseClient,
  proposalIds: string[],
): PagedQuery<BuyerProposalItemLinkRow> {
  return createGuardedPagedQuery(
    supabase
      .from("proposal_items")
      .select("proposal_id, request_item_id")
      .in("proposal_id", proposalIds)
      .order("proposal_id", { ascending: true })
      .order("request_item_id", { ascending: true }),
    isBuyerProposalItemLinkRow,
    "createBuyerProposalItemLinksQuery",
  );
}

export function createBuyerRequestItemToRequestMapQuery(
  supabase: SupabaseClient,
  requestItemIds: string[],
): PagedQuery<BuyerRequestItemToRequestRow> {
  return createGuardedPagedQuery(
    supabase
      .from("request_items")
      .select("id, request_id")
      .in("id", requestItemIds)
      .order("id", { ascending: true }),
    isBuyerRequestItemToRequestRow,
    "createBuyerRequestItemToRequestMapQuery",
  );
}
