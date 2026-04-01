import type { SupabaseClient } from "@supabase/supabase-js";

import type { CanonicalRequestItemRow } from "../../lib/api/requestCanonical.read";
import type { ReqHeadRow, ReqItemUiRow, WarehouseReqHeadsIntegrityState } from "./warehouse.types";
import { isUuid, parseNum, parseReqHeaderContext } from "./warehouse.request.utils";
import {
  fetchWarehouseFallbackStockRows,
  fetchWarehouseReqHeadTruthRows,
  fetchWarehouseRequestItemNoteRows,
  fetchWarehouseRequestMetaRows,
} from "./warehouse.api.repo";
import {
  aggregateWarehouseReqItemTruthRows,
  buildWarehouseStockAvailabilityCodeKey,
  buildWarehouseStockAvailabilityCodeUomKey,
  materializeWarehouseFallbackReqItems,
  normalizeWarehouseRequestItemFallbackRow,
  toWarehouseTextOrNull,
  type RequestItemFallbackRow,
  type ReqHeadTruth,
  type StockAvailabilityMap,
  type UnknownRow,
} from "./warehouse.adapters";
import {
  clearWarehouseRequestSourceTrace,
  readWarehouseRequestSourceTrace,
  recordWarehouseRequestSourceTrace,
  type WarehouseRequestSourcePath,
} from "./warehouse.cache";

export type ReqHeadsStageMetrics = {
  stage_a_ms: number;
  stage_b_ms: number;
  fallback_missing_ids_count: number;
  enriched_rows_count: number;
  page0_required_repair: boolean;
};

export type ReqHeadsConvergedResult = {
  rows: ReqHeadRow[];
  metrics: Omit<ReqHeadsStageMetrics, "stage_a_ms">;
  integrityState: WarehouseReqHeadsIntegrityState;
};

export type WarehouseReqHeadsSourceMeta = {
  primaryOwner:
    | "canonical_requests"
    | "compatibility_rpc_scope_v4"
    | "degraded_legacy_converged";
  sourcePath: WarehouseRequestSourcePath;
  fallbackUsed: boolean;
  sourceKind: string;
  contractVersion: string;
  reason: string | null;
};

export type WarehouseReqHeadsWindowMeta = {
  page: number;
  pageSize: number;
  pageOffset: number;
  returnedRowCount: number;
  totalRowCount: number | null;
  hasMore: boolean;
  repairedMissingIdsCount: number;
  scopeKey: string;
  generatedAt: string | null;
  contractVersion: string;
};

export type WarehouseReqHeadsFetchResult = {
  rows: ReqHeadRow[];
  metrics: ReqHeadsStageMetrics;
  meta: WarehouseReqHeadsWindowMeta;
  sourceMeta: WarehouseReqHeadsSourceMeta;
  integrityState: WarehouseReqHeadsIntegrityState;
};

export type WarehouseReqItemsSourceMeta = {
  primaryOwner:
    | "canonical_requests"
    | "compatibility_view_ui"
    | "degraded_direct_request_items";
  sourcePath: WarehouseRequestSourcePath;
  fallbackUsed: boolean;
  sourceKind: string;
  contractVersion: string;
  reason: string | null;
};

export type WarehouseReqItemsFetchResult = {
  rows: ReqItemUiRow[];
  sourceMeta: WarehouseReqItemsSourceMeta;
  meta: {
    requestId: string;
    returnedRowCount: number;
    scopeKey: string;
    generatedAt: string | null;
    contractVersion: string;
  };
};

export type WarehouseReqHeadsLegacyFetchResult = {
  rows: ReqHeadRow[];
  metrics: ReqHeadsStageMetrics;
  meta: WarehouseReqHeadsWindowMeta & {
    contractVersion: "legacy_converged";
  };
  sourceMeta: WarehouseReqHeadsSourceMeta;
  integrityState: WarehouseReqHeadsIntegrityState;
};

export type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };

export const WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND = "table:requests" as const;
export const WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND = "rpc:warehouse_issue_queue_scope_v4" as const;
export const WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND = "converged:req_heads" as const;
export const WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND = "table:request_items" as const;
export const WAREHOUSE_REQ_ITEMS_CANONICAL_MATERIALIZED_SOURCE_KIND =
  "canonical:request_items_materialized" as const;
export const WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND = "view:v_wh_issue_req_items_ui" as const;
export const WAREHOUSE_REQ_ITEMS_DIRECT_DEGRADED_SOURCE_KIND = "degraded:request_items" as const;

export const reqHeadsPerfNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export const logWarehouseRequestReadFallback = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    console.warn(`[warehouse.requests.read] ${scope}:`, message);
  }
};

export const normalizeUuidList = (values: unknown[]): string[] =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(isUuid)));

export const toReqHeadsScopeKey = (
  page: number,
  pageSize: number,
  sourcePath: WarehouseRequestSourcePath,
) => `${sourcePath}:warehouse_req_heads:${Math.max(0, page * pageSize)}:${pageSize}`;

export const toReqItemsScopeKey = (requestId: string, sourcePath: WarehouseRequestSourcePath) =>
  `${sourcePath}:warehouse_req_items:${requestId}`;

export const recordReqHeadsTrace = (params: {
  result: "success" | "error";
  sourcePath: WarehouseRequestSourcePath;
  sourceKind: string;
  page: number;
  pageSize: number;
  rowCount: number | null;
  contractVersion: string | null;
  reason?: string | null;
}) => {
  recordWarehouseRequestSourceTrace({
    timestamp: new Date().toISOString(),
    operation: "req_heads_window",
    result: params.result,
    sourcePath: params.sourcePath,
    sourceKind: params.sourceKind,
    reason: params.reason ?? null,
    requestId: null,
    page: params.page,
    pageSize: params.pageSize,
    rowCount: params.rowCount,
    contractVersion: params.contractVersion,
  });
};

export const recordReqItemsTrace = (params: {
  result: "success" | "error";
  sourcePath: WarehouseRequestSourcePath;
  sourceKind: string;
  requestId: string;
  rowCount: number | null;
  contractVersion: string | null;
  reason?: string | null;
}) => {
  recordWarehouseRequestSourceTrace({
    timestamp: new Date().toISOString(),
    operation: "req_items",
    result: params.result,
    sourcePath: params.sourcePath,
    sourceKind: params.sourceKind,
    reason: params.reason ?? null,
    requestId: params.requestId,
    page: null,
    pageSize: null,
    rowCount: params.rowCount,
    contractVersion: params.contractVersion,
  });
};

export const requireReqHeadsBoolean = (value: unknown, field: string): boolean => {
  if (typeof value === "boolean") return value;
  throw new Error(`warehouse_issue_queue_scope_v4 contract mismatch: ${field} must be boolean`);
};

const toReqHeadsContractVersion = (root: Record<string, unknown>, meta: Record<string, unknown>) =>
  toWarehouseTextOrNull(root.version) ?? toWarehouseTextOrNull(meta.payload_shape_version) ?? "v4";

export const toReqHeadsRpcMeta = (
  rootValue: unknown,
  page: number,
  pageSize: number,
  returnedRowCount: number,
): WarehouseReqHeadsWindowMeta => {
  const root = rootValue && typeof rootValue === "object" ? (rootValue as Record<string, unknown>) : {};
  const meta = root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : {};
  const pageOffset = Math.max(0, page * pageSize);
  const totalRowCountRaw = meta.total ?? meta.total_count ?? null;
  const totalRowCount =
    totalRowCountRaw == null
      ? null
      : Number.isFinite(Number(totalRowCountRaw))
        ? Math.max(0, Number(totalRowCountRaw))
        : null;
  const normalizedReturnedRowCount = Math.max(
    0,
    Number.isFinite(Number(returnedRowCount))
      ? Number(returnedRowCount)
      : Number.isFinite(Number(meta.row_count ?? meta.returned_row_count))
        ? Number(meta.row_count ?? meta.returned_row_count)
        : 0,
  );
  const hasMore =
    totalRowCount != null
      ? pageOffset + normalizedReturnedRowCount < totalRowCount
      : normalizedReturnedRowCount >= pageSize;
  return {
    page,
    pageSize,
    pageOffset,
    returnedRowCount: normalizedReturnedRowCount,
    totalRowCount,
    hasMore,
    repairedMissingIdsCount: Math.max(
      0,
      Number.isFinite(Number(meta.repaired_missing_ids_count))
        ? Number(meta.repaired_missing_ids_count)
        : 0,
    ),
    scopeKey: toWarehouseTextOrNull(meta.scope_key) ?? toReqHeadsScopeKey(page, pageSize, "compatibility"),
    generatedAt: toWarehouseTextOrNull(meta.generated_at),
    contractVersion: toReqHeadsContractVersion(root, meta),
  };
};

export const adaptReqHeadsRpcRow = (value: unknown, rowIndex: number): ReqHeadRow => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const requestId = String(row.request_id ?? row.id ?? "").trim();
  if (!requestId) {
    throw new Error(`warehouse_issue_queue_scope_v4 contract mismatch: rows[${rowIndex}].request_id is required`);
  }
  return {
    request_id: requestId,
    request_no: null,
    display_no: toWarehouseTextOrNull(row.display_no),
    request_status: toWarehouseTextOrNull(row.status),
    object_id: null,
    object_name: toWarehouseTextOrNull(row.object_name),
    level_code: toWarehouseTextOrNull(row.level_code),
    system_code: toWarehouseTextOrNull(row.system_code),
    zone_code: toWarehouseTextOrNull(row.zone_code),
    level_name: toWarehouseTextOrNull(row.level_name),
    system_name: toWarehouseTextOrNull(row.system_name),
    zone_name: toWarehouseTextOrNull(row.zone_name),
    contractor_name: toWarehouseTextOrNull(row.contractor_name),
    contractor_phone: toWarehouseTextOrNull(row.contractor_phone),
    planned_volume: toWarehouseTextOrNull(row.planned_volume),
    note: toWarehouseTextOrNull(row.note),
    comment: toWarehouseTextOrNull(row.comment),
    submitted_at: toWarehouseTextOrNull(row.submitted_at),
    items_cnt: Math.max(0, Number(row.items_cnt ?? 0) || 0),
    ready_cnt: Math.max(0, Number(row.ready_cnt ?? 0) || 0),
    done_cnt: Math.max(0, Number(row.done_cnt ?? 0) || 0),
    qty_limit_sum: parseNum(row.qty_limit_sum, 0),
    qty_issued_sum: parseNum(row.qty_issued_sum, 0),
    qty_left_sum: parseNum(row.qty_left_sum, 0),
    qty_can_issue_now_sum: parseNum(row.qty_can_issue_now_sum, 0),
    issuable_now_cnt: Math.max(0, Number(row.issuable_now_cnt ?? 0) || 0),
    issue_status: String(row.issue_status ?? "READY"),
    visible_in_expense_queue: requireReqHeadsBoolean(
      row.visible_in_expense_queue,
      `rows[${rowIndex}].visible_in_expense_queue`,
    ),
    can_issue_now: requireReqHeadsBoolean(row.can_issue_now, `rows[${rowIndex}].can_issue_now`),
    waiting_stock: requireReqHeadsBoolean(row.waiting_stock, `rows[${rowIndex}].waiting_stock`),
    all_done: requireReqHeadsBoolean(row.all_done, `rows[${rowIndex}].all_done`),
  };
};

async function loadFallbackStockAvailability(
  supabase: SupabaseClient,
  rows: RequestItemFallbackRow[],
): Promise<StockAvailabilityMap> {
  const codes = Array.from(
    new Set(rows.map((row) => buildWarehouseStockAvailabilityCodeKey(row.rik_code)).filter(Boolean)),
  );
  const result = await fetchWarehouseFallbackStockRows(supabase, codes);
  if (result.error || !Array.isArray(result.data) || !result.data.length) {
    return { byCode: {}, byCodeUom: {} };
  }

  const byCode: Record<string, number> = {};
  const byCodeUom: Record<string, number> = {};
  for (const row of result.data as UnknownRow[]) {
    const codeKey = buildWarehouseStockAvailabilityCodeKey(row.rik_code);
    if (!codeKey) continue;
    const qty = Math.max(0, parseNum(row.qty_available, 0));
    byCode[codeKey] = (byCode[codeKey] ?? 0) + qty;
    const codeUomKey = buildWarehouseStockAvailabilityCodeUomKey(row.rik_code, row.uom_id);
    byCodeUom[codeUomKey] = (byCodeUom[codeUomKey] ?? 0) + qty;
  }

  return { byCode, byCodeUom };
}

export async function loadWarehouseReqHeadTruthByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Record<string, ReqHeadTruth>> {
  const ids = normalizeUuidList(requestIds);
  if (!ids.length) return {};
  const result = await fetchWarehouseReqHeadTruthRows(supabase, ids);
  if (result.error || !Array.isArray(result.data) || result.data.length === 0) {
    return {};
  }
  return aggregateWarehouseReqItemTruthRows(result.data as UnknownRow[]);
}

const normalizePhone = (value: string) => {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return "";
  if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(source)) return "";
  const match = source.match(/(\+?\d[\d\s()\-]{7,}\d)/);
  if (!match) return "";
  const candidate = String(match[1] || "").trim();
  const digits = candidate.replace(/[^\d]/g, "");
  if (digits.length < 9) return "";
  return candidate.replace(/\s+/g, "");
};

async function enrichReqHeadsMeta(
  supabase: SupabaseClient,
  rows: ReqHeadRow[],
): Promise<ReqHeadRow[]> {
  const idsNeedMeta = rows
    .filter(
      (row) =>
        !String(row.contractor_name ?? "").trim() ||
        !String(row.contractor_phone ?? "").trim() ||
        !String(row.planned_volume ?? "").trim(),
    )
    .map((row) => String(row.request_id ?? "").trim())
    .filter(isUuid);

  if (!idsNeedMeta.length) return rows;

  const [reqQ, itemQ] = await Promise.all([
    fetchWarehouseRequestMetaRows(supabase, idsNeedMeta),
    fetchWarehouseRequestItemNoteRows(supabase, idsNeedMeta),
  ]);

  const reqById: Record<string, UnknownRow> = {};
  if (!reqQ.error && Array.isArray(reqQ.data)) {
    for (const row of reqQ.data as UnknownRow[]) {
      const id = String(row?.id ?? "").trim();
      if (id) reqById[id] = row;
    }
  }

  const itemNotesByReq: Record<string, string[]> = {};
  if (!itemQ.error && Array.isArray(itemQ.data)) {
    for (const item of itemQ.data as UnknownRow[]) {
      const requestId = String(item?.request_id ?? "").trim();
      if (!requestId) continue;
      const note = String(item?.note ?? "").trim();
      if (!note) continue;
      if (!itemNotesByReq[requestId]) itemNotesByReq[requestId] = [];
      itemNotesByReq[requestId].push(note);
    }
  }

  const pickVal = (obj: UnknownRow | undefined, keys: string[]) => {
    for (const key of keys) {
      const value = String(obj?.[key] ?? "").trim();
      if (value) return value;
    }
    return "";
  };

  return rows.map((row) => {
    const requestId = String(row.request_id ?? "").trim();
    const req = reqById[requestId];
    if (!req) return row;

    const fromReqText = parseReqHeaderContext([String(req?.note ?? ""), String(req?.comment ?? "")]);
    const fromItemText = parseReqHeaderContext(itemNotesByReq[requestId] ?? []);

    const contractor =
      pickVal(req, [
        "contractor_name",
        "contractor_org",
        "subcontractor_name",
        "subcontractor_org",
        "contractor",
        "supplier_name",
      ]) ||
      fromReqText.contractor ||
      fromItemText.contractor;
    const phone =
      pickVal(req, [
        "contractor_phone",
        "subcontractor_phone",
        "phone",
        "phone_number",
        "phone_no",
        "tel",
      ]) ||
      fromReqText.phone ||
      fromItemText.phone;
    const volume =
      pickVal(req, ["planned_volume", "qty_planned", "planned_qty", "volume", "qty_plan"]) ||
      fromReqText.volume ||
      fromItemText.volume;

    const rowPhone = normalizePhone(String(row.contractor_phone ?? ""));
    const derivedPhone = normalizePhone(phone);

    return {
      ...row,
      contractor_name: row.contractor_name ?? contractor ?? null,
      contractor_phone: rowPhone || derivedPhone || null,
      planned_volume: row.planned_volume ?? volume ?? null,
      note: row.note ?? toWarehouseTextOrNull(req?.note),
      comment: row.comment ?? toWarehouseTextOrNull(req?.comment),
    };
  });
}

export async function enrichReqHeadsMetaCounted(
  supabase: SupabaseClient,
  rows: ReqHeadRow[],
): Promise<{ rows: ReqHeadRow[]; enrichedRowsCount: number }> {
  const nextRows = await enrichReqHeadsMeta(supabase, rows);
  let enrichedRowsCount = 0;
  for (let index = 0; index < nextRows.length; index += 1) {
    const prev = rows[index];
    const next = nextRows[index];
    if (!prev || !next) continue;
    if (
      prev.contractor_name !== next.contractor_name ||
      prev.contractor_phone !== next.contractor_phone ||
      prev.planned_volume !== next.planned_volume ||
      prev.note !== next.note ||
      prev.comment !== next.comment
    ) {
      enrichedRowsCount += 1;
    }
  }
  return { rows: nextRows, enrichedRowsCount };
}

export const materializeCanonicalRequestItems = async (
  supabase: SupabaseClient,
  head: ReqHeadRow,
  items: CanonicalRequestItemRow[],
): Promise<ReqItemUiRowWithMeta[]> => {
  const fallbackRows = items.map((item) =>
    normalizeWarehouseRequestItemFallbackRow({
      id: item.id,
      request_id: item.request_id,
      rik_code: item.rik_code,
      name_human: item.name_human,
      uom: item.uom,
      qty: item.qty,
      status: item.status,
      note: item.note,
    }),
  );
  const stockAvailability = await loadFallbackStockAvailability(supabase, fallbackRows);
  return materializeWarehouseFallbackReqItems(fallbackRows, stockAvailability).map((row) => ({
    ...row,
    display_no: head.display_no,
    object_name: head.object_name,
    level_code: head.level_code,
    system_code: head.system_code,
    zone_code: head.zone_code,
    note:
      items.find((item) => item.id === row.request_item_id)?.note ??
      fallbackRows.find((item) => item.request_item_id === row.request_item_id)?.note ??
      null,
    comment: head.comment ?? null,
  }));
};

export const mapWarehouseReqItemsFromView = (
  rows: UnknownRow[],
  canonicalItemsById: Map<string, CanonicalRequestItemRow>,
  head: ReqHeadRow,
): ReqItemUiRowWithMeta[] => {
  const mapped = rows.map((row) => {
    const requestItemId = String(row.request_item_id ?? "").trim();
    const canonicalItem = canonicalItemsById.get(requestItemId) ?? null;
    return {
      request_id: String(row.request_id ?? head.request_id),
      request_item_id: requestItemId,
      display_no: head.display_no,
      object_name: head.object_name,
      level_code: head.level_code,
      system_code: head.system_code,
      zone_code: head.zone_code,
      rik_code: String(row.rik_code ?? canonicalItem?.rik_code ?? ""),
      name_human: String(row.name_human ?? canonicalItem?.name_human ?? row.rik_code ?? ""),
      uom: toWarehouseTextOrNull(row.uom ?? canonicalItem?.uom),
      qty_limit: parseNum(row.qty_limit ?? canonicalItem?.qty, 0),
      qty_issued: parseNum(row.qty_issued, 0),
      qty_left: parseNum(row.qty_left, 0),
      qty_available: parseNum(row.qty_available, 0),
      qty_can_issue_now: parseNum(row.qty_can_issue_now, 0),
      note: canonicalItem?.note ?? toWarehouseTextOrNull(row.note),
      comment: head.comment ?? toWarehouseTextOrNull(row.comment),
    };
  });

  const dedupedById: Record<string, ReqItemUiRowWithMeta> = {};
  for (const item of mapped) {
    const requestItemId = String(item.request_item_id ?? "").trim();
    if (!requestItemId) continue;
    const previous = dedupedById[requestItemId];
    if (!previous) {
      dedupedById[requestItemId] = item;
      continue;
    }
    dedupedById[requestItemId] = {
      ...previous,
      rik_code: previous.rik_code || item.rik_code,
      name_human: previous.name_human || item.name_human,
      uom: previous.uom ?? item.uom,
      note: previous.note ?? item.note ?? null,
      comment: previous.comment ?? item.comment ?? null,
      qty_limit: Math.max(parseNum(previous.qty_limit, 0), parseNum(item.qty_limit, 0)),
      qty_issued: Math.max(parseNum(previous.qty_issued, 0), parseNum(item.qty_issued, 0)),
      qty_left: Math.max(parseNum(previous.qty_left, 0), parseNum(item.qty_left, 0)),
      qty_available: Math.max(parseNum(previous.qty_available, 0), parseNum(item.qty_available, 0)),
      qty_can_issue_now: Math.max(
        parseNum(previous.qty_can_issue_now, 0),
        parseNum(item.qty_can_issue_now, 0),
      ),
    };
  }

  return Object.values(dedupedById).sort((left, right) =>
    String(left.name_human ?? "").localeCompare(String(right.name_human ?? "")),
  );
};

export { clearWarehouseRequestSourceTrace, readWarehouseRequestSourceTrace };
