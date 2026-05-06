import { loadPagedRowsWithCeiling, type PagedQuery } from "../api/_core";
import { filterRequestLinkedRowsByExistingRequestLinks } from "../api/integrity.guards";
import { supabase } from "../supabaseClient";
import type {
  CatalogRequestDisplayNoArgs,
  CatalogRequestItemUpdate,
  CatalogRequestItemUpdateQtyArgs,
  CatalogRequestUpdate,
} from "../../types/contracts/catalog";

export type CatalogDynamicReadSource =
  | "request_display"
  | "vi_requests_display"
  | "vi_requests"
  | "v_requests_display"
  | "v_request_pdf_header"
  | "requests";

export type CatalogRequestReadResponse<T = unknown> = Promise<{
  data: T | null;
  error: { message?: string } | null;
}>;

export type CatalogRequestWriteResponse = Promise<{
  error: CatalogTransportError;
}>;

export type CatalogTransportError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null;

export type CatalogRequestPagedReadResult<T> = Promise<{
  data: T[] | null;
  error: unknown | null;
}>;

export type CatalogRequestLinkedRow = {
  id?: unknown;
  request_id?: unknown;
};

export type CatalogRequestDisplayRpcName = "request_display_no" | "request_display" | "request_label";

export type CatalogRequestsExtendedMetaUpdate = CatalogRequestUpdate & {
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
};

export const CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};

const REQUEST_ITEM_SELECT =
  "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order,updated_at";

const FOREMAN_REQUEST_SELECT =
  `id,status,created_at,need_by,display_no,
     object_type_code,level_code,system_code,zone_code,
     object:ref_object_types(*),
     level:ref_levels(*),
     system:ref_systems(*),
     zone:ref_zones(*)`;

const fromCatalogDynamicReadSource = (relation: CatalogDynamicReadSource) =>
  (supabase.from.bind(supabase) as (
    name: CatalogDynamicReadSource,
  ) => {
    select(columns: string): {
      eq(column: "id" | "display_no", value: string): {
        maybeSingle(): CatalogRequestReadResponse;
      };
    };
  })(relation);

export const selectCatalogDynamicReadSingle = async (
  relation: CatalogDynamicReadSource,
  columns: string,
  id: string,
  matchColumn: "id" | "display_no" = "id",
): CatalogRequestReadResponse =>
  await fromCatalogDynamicReadSource(relation).select(columns).eq(matchColumn, id).maybeSingle();

const callCatalogRequestRpc = async (
  fn: CatalogRequestDisplayRpcName | "request_item_update_qty",
  args: CatalogRequestDisplayNoArgs | CatalogRequestItemUpdateQtyArgs,
): Promise<{
  data: unknown;
  error: { message?: string } | null;
}> => {
  const rpc = supabase.rpc.bind(supabase) as (
    rpcName: CatalogRequestDisplayRpcName | "request_item_update_qty",
    rpcArgs: CatalogRequestDisplayNoArgs | CatalogRequestItemUpdateQtyArgs,
  ) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
  return await rpc(fn, args);
};

export const runCatalogRequestDisplayRpc = async (
  fn: CatalogRequestDisplayRpcName,
  args: CatalogRequestDisplayNoArgs,
): Promise<{ data: string | null; error: { message?: string } | null }> => {
  const { data, error } = await callCatalogRequestRpc(fn, args);
  return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
};

export const updateCatalogRequestRow = async (
  requestId: string,
  payload: CatalogRequestsExtendedMetaUpdate,
): CatalogRequestWriteResponse =>
  await supabase.from("requests").update(payload).eq("id", requestId);

export const updateCatalogRequestItemQtyViaRpc = async (
  args: CatalogRequestItemUpdateQtyArgs,
): CatalogRequestReadResponse =>
  await callCatalogRequestRpc("request_item_update_qty", args);

export const updateCatalogRequestItemQtyRow = async (
  requestItemId: string,
  qty: number,
): CatalogRequestReadResponse =>
  await supabase
    .from("request_items")
    .update({ qty } satisfies CatalogRequestItemUpdate)
    .eq("id", requestItemId)
    .select(REQUEST_ITEM_SELECT)
    .maybeSingle();

export const cancelCatalogRequestItemRow = async (
  requestItemId: string,
  cancelledAt: string,
): CatalogRequestWriteResponse =>
  await supabase
    .from("request_items")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
    } satisfies CatalogRequestItemUpdate)
    .eq("id", requestItemId);

export const loadCatalogRequestDraftStatusRow = async (
  requestId: string,
): CatalogRequestReadResponse =>
  await supabase.from("requests").select("id,status").eq("id", requestId).maybeSingle();

export const loadCatalogRequestExtendedMetaSampleRows = async (): Promise<{
  data: unknown[] | null;
  error: { message?: string } | null;
}> => await supabase.from("requests").select("*").limit(1);

export const loadCatalogRequestDisplayHeaderRow = async (
  requestId: string,
): CatalogRequestReadResponse =>
  await supabase.from("requests").select("id,display_no").eq("id", requestId).maybeSingle();

export const loadCatalogRequestDetailsRowById = async (
  columns: string,
  requestId: string,
): CatalogRequestReadResponse =>
  await supabase.from("requests").select(columns).eq("id", requestId).maybeSingle();

export const loadCatalogRequestDetailsRowByDisplayNo = async (
  columns: string,
  displayNo: string,
): CatalogRequestReadResponse =>
  await supabase.from("requests").select(columns).eq("display_no", displayNo).maybeSingle();

export const loadCatalogRequestItemRows = async (
  requestId: string,
): CatalogRequestPagedReadResult<Record<string, unknown>> =>
  await loadPagedRowsWithCeiling<Record<string, unknown>>(
    () =>
      supabase
        .from("request_items")
        .select(REQUEST_ITEM_SELECT)
        .eq("request_id", requestId)
        .order("row_no", { ascending: true })
        .order("position_order", { ascending: true })
        .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>,
    CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS,
  );

export const filterCatalogRequestLinkedRowsByExistingRequestLinks = async <
  T extends CatalogRequestLinkedRow,
>(
  rows: readonly T[],
  context: {
    screen: "request";
    surface: string;
    sourceKind: string;
    relation: string;
  },
) => await filterRequestLinkedRowsByExistingRequestLinks(supabase, rows, context);

export const loadCatalogForemanRequestRowsByName = async (
  foremanName: string,
  limit: number,
): CatalogRequestReadResponse<unknown[]> =>
  await supabase
    .from("requests")
    .select(FOREMAN_REQUEST_SELECT)
    .ilike("foreman_name", foremanName)
    .not("display_no", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

export const loadCatalogForemanRequestRowsByCreatedBy = async (
  userId: string,
  limit: number,
): CatalogRequestReadResponse<unknown[]> =>
  await supabase
    .from("requests")
    .select(FOREMAN_REQUEST_SELECT)
    .eq("created_by", userId)
    .not("display_no", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

export const loadCatalogRequestItemStatusRows = async (
  requestIds: string[],
): CatalogRequestPagedReadResult<Record<string, unknown>> =>
  await loadPagedRowsWithCeiling<Record<string, unknown>>(
    () =>
      supabase
        .from("request_items")
        .select("request_id,status")
        .in("request_id", requestIds)
        .order("request_id", { ascending: true })
        .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>,
    CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS,
  );
