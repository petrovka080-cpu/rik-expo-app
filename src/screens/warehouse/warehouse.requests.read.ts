import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReqHeadRow, ReqItemUiRow, WarehouseReqHeadsIntegrityState } from "./warehouse.types";
import { isUuid, parseNum, parseReqHeaderContext } from "./warehouse.request.utils";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { isRequestVisibleInWarehouseIssueQueue } from "../../lib/requestStatus";
import {
  loadCanonicalRequestItemsByRequestId,
  loadCanonicalRequestsByIds,
  loadCanonicalRequestsWindow,
  type CanonicalRequestItemRow,
} from "../../lib/api/requestCanonical.read";
import {
  asUnknownRows,
  fetchWarehouseFallbackStockRows,
  fetchWarehouseReqHeadTruthRows,
  fetchWarehouseRequestItemNoteRows,
  fetchWarehouseRequestMetaRows,
} from "./warehouse.api.repo";
import {
  aggregateWarehouseReqItemTruthRows,
  applyWarehouseReqHeadTruth,
  buildWarehouseStockAvailabilityCodeKey,
  buildWarehouseStockAvailabilityCodeUomKey,
  compareWarehouseReqHeads,
  mapWarehouseCanonicalRequestToReqHeadRow,
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
import {
  compareWarehouseReqHeads as compareWarehouseReqHeadsRepair,
  repairWarehouseReqHeadsPage0,
} from "./warehouse.reqHeads.repair";
import { classifyWarehouseReqHeadsFailure } from "./warehouse.reqHeads.failure";
import {
  createHealthyWarehouseReqHeadsIntegrityState,
  createWarehouseReqHeadsIntegrityState,
} from "./warehouse.reqHeads.state";

type ReqHeadsStageMetrics = {
  stage_a_ms: number;
  stage_b_ms: number;
  fallback_missing_ids_count: number;
  enriched_rows_count: number;
  page0_required_repair: boolean;
};

type ReqHeadsConvergedResult = {
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

type WarehouseReqHeadsLegacyFetchResult = {
  rows: ReqHeadRow[];
  metrics: ReqHeadsStageMetrics;
  meta: WarehouseReqHeadsWindowMeta & {
    contractVersion: "legacy_converged";
  };
  sourceMeta: WarehouseReqHeadsSourceMeta;
  integrityState: WarehouseReqHeadsIntegrityState;
};

type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };

const WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND = "table:requests" as const;
const WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND = "rpc:warehouse_issue_queue_scope_v4" as const;
const WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND = "converged:req_heads" as const;
const WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND = "table:request_items" as const;
const WAREHOUSE_REQ_ITEMS_CANONICAL_MATERIALIZED_SOURCE_KIND = "canonical:request_items_materialized" as const;
const WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND = "view:v_wh_issue_req_items_ui" as const;
const WAREHOUSE_REQ_ITEMS_DIRECT_DEGRADED_SOURCE_KIND = "degraded:request_items" as const;

const reqHeadsPerfNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const logWarehouseRequestReadFallback = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    console.warn(`[warehouse.requests.read] ${scope}:`, message);
  }
};

const normalizeUuidList = (values: unknown[]): string[] =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(isUuid)));

const toReqHeadsScopeKey = (page: number, pageSize: number, sourcePath: WarehouseRequestSourcePath) =>
  `${sourcePath}:warehouse_req_heads:${Math.max(0, page * pageSize)}:${pageSize}`;

const toReqItemsScopeKey = (requestId: string, sourcePath: WarehouseRequestSourcePath) =>
  `${sourcePath}:warehouse_req_items:${requestId}`;

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

const recordReqHeadsTrace = (params: {
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

const recordReqItemsTrace = (params: {
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

const requireReqHeadsBoolean = (value: unknown, field: string): boolean => {
  if (typeof value === "boolean") return value;
  throw new Error(`warehouse_issue_queue_scope_v4 contract mismatch: ${field} must be boolean`);
};

const toReqHeadsContractVersion = (root: Record<string, unknown>, meta: Record<string, unknown>) =>
  toWarehouseTextOrNull(root.version) ?? toWarehouseTextOrNull(meta.payload_shape_version) ?? "v4";

const toReqHeadsRpcMeta = (
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

const adaptReqHeadsRpcRow = (value: unknown, rowIndex: number): ReqHeadRow => {
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

async function loadWarehouseReqHeadTruthByRequestIds(
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

function mapReqHeadViewRow(value: UnknownRow): ReqHeadRow {
  return {
    request_id: String(value.request_id ?? ""),
    request_no: null,
    display_no: toWarehouseTextOrNull(value.display_no),
    request_status: null,
    object_id: null,
    object_name: toWarehouseTextOrNull(value.object_name),
    level_code: toWarehouseTextOrNull(value.level_code),
    system_code: toWarehouseTextOrNull(value.system_code),
    zone_code: toWarehouseTextOrNull(value.zone_code),
    level_name: toWarehouseTextOrNull(value.level_name),
    system_name: toWarehouseTextOrNull(value.system_name),
    zone_name: toWarehouseTextOrNull(value.zone_name),
    contractor_name: toWarehouseTextOrNull(value.contractor_name ?? value.contractor_org ?? value.subcontractor_name),
    contractor_phone: toWarehouseTextOrNull(value.contractor_phone ?? value.phone ?? value.phone_number),
    planned_volume: toWarehouseTextOrNull(value.planned_volume ?? value.volume ?? value.qty_plan),
    note: toWarehouseTextOrNull(value.note),
    comment: toWarehouseTextOrNull(value.comment),
    submitted_at: toWarehouseTextOrNull(value.submitted_at),
    items_cnt: Number(value.items_cnt ?? 0),
    ready_cnt: Number(value.ready_cnt ?? 0),
    done_cnt: Number(value.done_cnt ?? 0),
    qty_limit_sum: parseNum(value.qty_limit_sum, 0),
    qty_issued_sum: parseNum(value.qty_issued_sum, 0),
    qty_left_sum: parseNum(value.qty_left_sum, 0),
    qty_can_issue_now_sum: parseNum(value.qty_can_issue_now_sum, 0),
    issuable_now_cnt: parseNum(value.issuable_now_cnt, 0),
    issue_status: String(value.issue_status ?? "READY"),
  };
}

async function loadApprovedViewReqHeadsWindowRows(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<ReqHeadRow[]> {
  const q = await supabase
    .from("v_wh_issue_req_heads_ui")
    .select("*")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("display_no", { ascending: false })
    .order("request_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q.error || !Array.isArray(q.data) || q.data.length === 0) return [];

  const rows = (q.data as UnknownRow[]).map(mapReqHeadViewRow).sort(compareWarehouseReqHeadsRepair);
  const requestIds = normalizeUuidList(rows.map((row) => row.request_id));
  if (!requestIds.length) return [];

  const requestStatuses = await loadCanonicalRequestsByIds(supabase, requestIds, {
    includeItemCounts: false,
  });
  const requestStatusById = new Map<string, string>();
  for (const row of requestStatuses.rows) {
    requestStatusById.set(row.id, String(row.status ?? ""));
  }

  return rows.filter((row) =>
    isRequestVisibleInWarehouseIssueQueue(requestStatusById.get(String(row.request_id ?? "").trim()) ?? ""),
  );
}

async function loadApprovedViewReqHeadsWindow(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<ReqHeadRow[]> {
  const approvedRows = await loadApprovedViewReqHeadsWindowRows(supabase, offset, limit);
  if (!approvedRows.length) return [];

  const truthByRequestId = await loadWarehouseReqHeadTruthByRequestIds(
    supabase,
    approvedRows.map((row) => row.request_id),
  );

  return approvedRows
    .map((row) => applyWarehouseReqHeadTruth(row, truthByRequestId[String(row.request_id ?? "").trim()]))
    .filter((row) => row.visible_in_expense_queue);
}

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

    const fromReqText = parseReqHeaderContext([
      String(req?.note ?? ""),
      String(req?.comment ?? ""),
    ]);
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

async function enrichReqHeadsMetaCounted(
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

async function loadReqHeadsConverged(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
): Promise<ReqHeadsConvergedResult> {
  const stageStartedAt = reqHeadsPerfNow();
  const targetVisibleCount = Math.max(0, (page + 1) * pageSize);
  const viewChunkSize = Math.max(pageSize, 50);
  const maxWindowScans = 8;
  const visibleViewRows: ReqHeadRow[] = [];
  const materializedReqIds = new Set<string>();

  for (let scan = 0; scan < maxWindowScans && visibleViewRows.length < targetVisibleCount; scan += 1) {
    const offset = scan * viewChunkSize;
    const windowRows = await loadApprovedViewReqHeadsWindow(supabase, offset, viewChunkSize);
    if (!windowRows.length) break;
    for (const row of windowRows) {
      const requestId = String(row.request_id ?? "").trim();
      if (!requestId || materializedReqIds.has(requestId)) continue;
      materializedReqIds.add(requestId);
      visibleViewRows.push(row);
    }
    if (windowRows.length < viewChunkSize) break;
  }

  let mergedRows = [...visibleViewRows].sort(compareWarehouseReqHeadsRepair);
  let fallbackMissingIdsCount = 0;
  let page0RequiredRepair = false;
  let integrityState = createHealthyWarehouseReqHeadsIntegrityState();

  if (page === 0) {
    try {
      const repaired = await repairWarehouseReqHeadsPage0({
        supabase,
        pageSize,
        viewRows: mergedRows,
      });
      mergedRows = repaired.rows;
      fallbackMissingIdsCount = repaired.fallbackMissingIdsCount;
      page0RequiredRepair = repaired.page0RequiredRepair;
      integrityState = repaired.integrityState;
    } catch (error) {
      logWarehouseRequestReadFallback("req_heads_degraded/repair", error);
      const failure = classifyWarehouseReqHeadsFailure(error);
      integrityState = createWarehouseReqHeadsIntegrityState({
        mode: mergedRows.length > 0 ? "stale_last_known_good" : "error",
        failureClass: failure.failureClass,
        reason: "req_heads_repair_failed",
        message: error instanceof Error ? error.message : String(error ?? "unknown"),
        cacheUsed: mergedRows.length > 0,
      });
    }
  }

  const stageBDurationMs = reqHeadsPerfNow() - stageStartedAt;
  const viewRows = mergedRows.slice(page * pageSize, (page + 1) * pageSize);

  try {
    const enriched = await enrichReqHeadsMetaCounted(supabase, viewRows);
    return {
      rows: enriched.rows,
      metrics: {
        stage_b_ms: stageBDurationMs,
        fallback_missing_ids_count: fallbackMissingIdsCount,
        enriched_rows_count: enriched.enrichedRowsCount,
        page0_required_repair: page0RequiredRepair,
      },
      integrityState,
    };
  } catch (error) {
    logWarehouseRequestReadFallback("req_heads_degraded/enrich", error);
    return {
      rows: viewRows,
      metrics: {
        stage_b_ms: stageBDurationMs,
        fallback_missing_ids_count: fallbackMissingIdsCount,
        enriched_rows_count: 0,
        page0_required_repair: page0RequiredRepair,
      },
      integrityState,
    };
  }
}

async function apiFetchReqHeadsCompatibilityRaw(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  reason: string | null,
): Promise<WarehouseReqHeadsFetchResult> {
  const offset = Math.max(0, page * pageSize);
  const { data, error } = await supabase.rpc("warehouse_issue_queue_scope_v4", {
    p_offset: offset,
    p_limit: pageSize,
  });
  if (error) throw error;

  const root =
    data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  if (!Array.isArray(root.rows)) {
    throw new Error("warehouse_issue_queue_scope_v4 contract mismatch: rows must be an array");
  }
  const rows = root.rows.map((row, index) => adaptReqHeadsRpcRow(row, index));
  const meta = toReqHeadsRpcMeta(root, page, pageSize, rows.length);

  return {
    rows,
    metrics: {
      stage_a_ms: 0,
      stage_b_ms: 0,
      fallback_missing_ids_count: meta.repairedMissingIdsCount,
      enriched_rows_count: 0,
      page0_required_repair: meta.repairedMissingIdsCount > 0,
    },
    meta: {
      ...meta,
      scopeKey: toReqHeadsScopeKey(page, pageSize, "compatibility"),
    },
    sourceMeta: {
      primaryOwner: "compatibility_rpc_scope_v4",
      sourcePath: "compatibility",
      fallbackUsed: true,
      sourceKind: WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
      contractVersion: meta.contractVersion,
      reason,
    },
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
  };
}

async function apiFetchReqHeadsDegradedRaw(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  reason: string | null,
): Promise<WarehouseReqHeadsLegacyFetchResult> {
  const legacy = await loadReqHeadsConverged(supabase, page, pageSize);
  return {
    rows: legacy.rows,
    metrics: {
      stage_a_ms: 0,
      ...legacy.metrics,
    },
    meta: {
      page,
      pageSize,
      pageOffset: Math.max(0, page * pageSize),
      returnedRowCount: legacy.rows.length,
      totalRowCount: null,
      hasMore: legacy.rows.length > 0,
      repairedMissingIdsCount: legacy.metrics.fallback_missing_ids_count,
      scopeKey: toReqHeadsScopeKey(page, pageSize, "degraded"),
      generatedAt: null,
      contractVersion: "legacy_converged",
    },
    sourceMeta: {
      primaryOwner: "degraded_legacy_converged",
      sourcePath: "degraded",
      fallbackUsed: true,
      sourceKind: WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND,
      contractVersion: "legacy_converged",
      reason,
    },
    integrityState: legacy.integrityState,
  };
}

async function apiFetchReqHeadsCanonicalRaw(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
): Promise<WarehouseReqHeadsFetchResult> {
  const targetVisibleCount = Math.max(0, (page + 1) * pageSize + 1);
  const windowSize = Math.max(pageSize, 50);
  const maxWindowScans = 12;
  const visibleRequests: ReqHeadRow[] = [];
  const seenRequestIds = new Set<string>();
  let exhausted = false;
  let canonicalGeneratedAt: string | null = null;
  let canonicalContractVersion = "request_lookup_v2";

  for (let scan = 0; scan < maxWindowScans && visibleRequests.length < targetVisibleCount; scan += 1) {
    const offset = scan * windowSize;
    const window = await loadCanonicalRequestsWindow(supabase, {
      offset,
      limit: windowSize,
      includeItemCounts: true,
    });
    canonicalGeneratedAt = window.meta.generatedAt;
    canonicalContractVersion = window.meta.contractVersion;
    if (!window.rows.length) {
      exhausted = true;
      break;
    }
    for (const request of window.rows) {
      if (!isRequestVisibleInWarehouseIssueQueue(request.status)) continue;
      if (seenRequestIds.has(request.id)) continue;
      seenRequestIds.add(request.id);
      visibleRequests.push(mapWarehouseCanonicalRequestToReqHeadRow(request));
    }
    if (window.rows.length < windowSize) {
      exhausted = true;
      break;
    }
  }

  const pageStart = Math.max(0, page * pageSize);
  const pageEnd = pageStart + pageSize;
  const pageRows = visibleRequests.slice(pageStart, pageEnd);
  const hasMore = visibleRequests.length > pageEnd || !exhausted;
  const truthByRequestId = await loadWarehouseReqHeadTruthByRequestIds(
    supabase,
    pageRows.map((row) => row.request_id),
  );
  const enrichedBaseRows = pageRows
    .map((row) => applyWarehouseReqHeadTruth(row, truthByRequestId[String(row.request_id ?? "").trim()]))
    .sort(compareWarehouseReqHeads);
  const enriched = await enrichReqHeadsMetaCounted(supabase, enrichedBaseRows);

  return {
    rows: enriched.rows,
    metrics: {
      stage_a_ms: 0,
      stage_b_ms: 0,
      fallback_missing_ids_count: 0,
      enriched_rows_count: enriched.enrichedRowsCount,
      page0_required_repair: false,
    },
    meta: {
      page,
      pageSize,
      pageOffset: pageStart,
      returnedRowCount: enriched.rows.length,
      totalRowCount: null,
      hasMore,
      repairedMissingIdsCount: 0,
      scopeKey: toReqHeadsScopeKey(page, pageSize, "canonical"),
      generatedAt: canonicalGeneratedAt,
      contractVersion: canonicalContractVersion,
    },
    sourceMeta: {
      primaryOwner: "canonical_requests",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      contractVersion: canonicalContractVersion,
      reason: null,
    },
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
  };
}

export async function apiFetchReqHeadsWindow(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
): Promise<WarehouseReqHeadsFetchResult> {
  const observation = beginPlatformObservability({
    screen: "warehouse",
    surface: "req_heads",
    category: "fetch",
    event: "fetch_req_heads",
    sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
  });

  try {
    const result = await apiFetchReqHeadsCanonicalRaw(supabase, page, pageSize);
    recordReqHeadsTrace({
      result: "success",
      sourcePath: result.sourceMeta.sourcePath,
      sourceKind: result.sourceMeta.sourceKind,
      page,
      pageSize,
      rowCount: result.rows.length,
      contractVersion: result.sourceMeta.contractVersion,
    });
    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        page,
        pageSize,
        pageOffset: result.meta.pageOffset,
        scopeKey: result.meta.scopeKey,
        contractVersion: result.meta.contractVersion,
        generatedAt: result.meta.generatedAt,
        primaryOwner: result.sourceMeta.primaryOwner,
        sourcePath: result.sourceMeta.sourcePath,
        totalRowCount: result.meta.totalRowCount,
        hasMore: result.meta.hasMore,
        integrityMode: result.integrityState.mode,
      },
    });
    return result;
  } catch (canonicalError) {
    const canonicalMessage =
      canonicalError instanceof Error ? canonicalError.message : String(canonicalError ?? "unknown");
    recordReqHeadsTrace({
      result: "error",
      sourcePath: "canonical",
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      page,
      pageSize,
      rowCount: null,
      contractVersion: "request_lookup_v2",
      reason: canonicalMessage,
    });
    recordPlatformObservability({
      screen: "warehouse",
      surface: "req_heads",
      category: "fetch",
      event: "fetch_req_heads_canonical_failed",
      result: "error",
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      fallbackUsed: true,
      errorStage: "fetch_req_heads_canonical",
      errorClass: canonicalError instanceof Error ? canonicalError.name : undefined,
      errorMessage: canonicalMessage,
      extra: {
        page,
        pageSize,
        pageOffset: Math.max(0, page * pageSize),
      },
    });

    try {
      const compatibility = await apiFetchReqHeadsCompatibilityRaw(
        supabase,
        page,
        pageSize,
        canonicalMessage,
      );
      recordReqHeadsTrace({
        result: "success",
        sourcePath: compatibility.sourceMeta.sourcePath,
        sourceKind: compatibility.sourceMeta.sourceKind,
        page,
        pageSize,
        rowCount: compatibility.rows.length,
        contractVersion: compatibility.sourceMeta.contractVersion,
        reason: canonicalMessage,
      });
      observation.success({
        rowCount: compatibility.rows.length,
        sourceKind: compatibility.sourceMeta.sourceKind,
        fallbackUsed: true,
        extra: {
          page,
          pageSize,
          pageOffset: compatibility.meta.pageOffset,
          scopeKey: compatibility.meta.scopeKey,
          contractVersion: compatibility.meta.contractVersion,
          generatedAt: compatibility.meta.generatedAt,
          primaryOwner: compatibility.sourceMeta.primaryOwner,
          sourcePath: compatibility.sourceMeta.sourcePath,
          totalRowCount: compatibility.meta.totalRowCount,
          hasMore: compatibility.meta.hasMore,
          fallbackReason: canonicalMessage,
          integrityMode: compatibility.integrityState.mode,
        },
      });
      return compatibility;
    } catch (compatibilityError) {
      const compatibilityMessage =
        compatibilityError instanceof Error
          ? compatibilityError.message
          : String(compatibilityError ?? "unknown");
      recordReqHeadsTrace({
        result: "error",
        sourcePath: "compatibility",
        sourceKind: WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
        page,
        pageSize,
        rowCount: null,
        contractVersion: "v4",
        reason: compatibilityMessage,
      });
      const degraded = await apiFetchReqHeadsDegradedRaw(supabase, page, pageSize, compatibilityMessage);
      recordReqHeadsTrace({
        result: "success",
        sourcePath: degraded.sourceMeta.sourcePath,
        sourceKind: degraded.sourceMeta.sourceKind,
        page,
        pageSize,
        rowCount: degraded.rows.length,
        contractVersion: degraded.sourceMeta.contractVersion,
        reason: compatibilityMessage,
      });
      observation.success({
        rowCount: degraded.rows.length,
        sourceKind: degraded.sourceMeta.sourceKind,
        fallbackUsed: true,
        extra: {
          page,
          pageSize,
          pageOffset: degraded.meta.pageOffset,
          scopeKey: degraded.meta.scopeKey,
          contractVersion: degraded.meta.contractVersion,
          generatedAt: degraded.meta.generatedAt,
          primaryOwner: degraded.sourceMeta.primaryOwner,
          sourcePath: degraded.sourceMeta.sourcePath,
          totalRowCount: degraded.meta.totalRowCount,
          hasMore: degraded.meta.hasMore,
          fallbackReason: compatibilityMessage,
          integrityMode: degraded.integrityState.mode,
        },
      });
      return degraded;
    }
  }
}

export async function apiFetchReqHeads(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
): Promise<ReqHeadRow[]> {
  const result = await apiFetchReqHeadsWindow(supabase, page, pageSize);
  return result.rows;
}

export async function apiFetchReqHeadsStaged(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
): Promise<{
  baseRows: ReqHeadRow[];
  meta: WarehouseReqHeadsWindowMeta;
  sourceMeta: WarehouseReqHeadsSourceMeta;
  metrics: ReqHeadsStageMetrics;
  finalRowsPromise: Promise<WarehouseReqHeadsFetchResult>;
}> {
  const stageStartedAt = reqHeadsPerfNow();
  const primary = await apiFetchReqHeadsWindow(supabase, page, pageSize);
  const baseMetrics: ReqHeadsStageMetrics = {
    ...primary.metrics,
    stage_a_ms: reqHeadsPerfNow() - stageStartedAt,
    stage_b_ms: primary.metrics.stage_b_ms,
  };

  return {
    baseRows: primary.rows,
    meta: primary.meta,
    sourceMeta: primary.sourceMeta,
    metrics: baseMetrics,
    finalRowsPromise: Promise.resolve({
      ...primary,
      metrics: baseMetrics,
    }),
  };
}

const materializeCanonicalRequestItems = async (
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

const mapWarehouseReqItemsFromView = (
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

async function apiFetchReqItemsCompatibilityRaw(
  supabase: SupabaseClient,
  requestId: string,
  reason: string | null,
): Promise<WarehouseReqItemsFetchResult> {
  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .eq("request_id", requestId)
    .order("name_human", { ascending: true });

  if (q.error) throw q.error;

  const headLookup = await loadCanonicalRequestsByIds(supabase, [requestId], {
    includeItemCounts: true,
  });
  const head = headLookup.rows.length
    ? mapWarehouseCanonicalRequestToReqHeadRow(headLookup.rows[0])
    : ({
        request_id: requestId,
        request_no: null,
        display_no: null,
        request_status: null,
        object_id: null,
        object_name: null,
        level_code: null,
        system_code: null,
        zone_code: null,
        submitted_at: null,
        items_cnt: 0,
        ready_cnt: 0,
        done_cnt: 0,
        qty_limit_sum: 0,
        qty_issued_sum: 0,
        qty_left_sum: 0,
        issue_status: "WAITING_STOCK",
      } as ReqHeadRow);

  const canonicalItems = await loadCanonicalRequestItemsByRequestId(supabase, requestId);
  const canonicalItemsById = new Map(canonicalItems.map((item) => [item.id, item]));
  const rows = mapWarehouseReqItemsFromView(asUnknownRows(q.data), canonicalItemsById, head);

  return {
    rows,
    sourceMeta: {
      primaryOwner: "compatibility_view_ui",
      sourcePath: "compatibility",
      fallbackUsed: true,
      sourceKind: WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND,
      contractVersion: "view_ui_v1",
      reason,
    },
    meta: {
      requestId,
      returnedRowCount: rows.length,
      scopeKey: toReqItemsScopeKey(requestId, "compatibility"),
      generatedAt: new Date().toISOString(),
      contractVersion: "view_ui_v1",
    },
  };
}

async function apiFetchReqItemsDegradedDirectRaw(
  supabase: SupabaseClient,
  requestId: string,
  reason: string | null,
): Promise<WarehouseReqItemsFetchResult> {
  const headLookup = await loadCanonicalRequestsByIds(supabase, [requestId], {
    includeItemCounts: true,
  });
  const head = headLookup.rows.length
    ? mapWarehouseCanonicalRequestToReqHeadRow(headLookup.rows[0])
    : ({
        request_id: requestId,
        request_no: null,
        display_no: null,
        request_status: null,
        object_id: null,
        object_name: null,
        level_code: null,
        system_code: null,
        zone_code: null,
        submitted_at: null,
        items_cnt: 0,
        ready_cnt: 0,
        done_cnt: 0,
        qty_limit_sum: 0,
        qty_issued_sum: 0,
        qty_left_sum: 0,
        issue_status: "WAITING_STOCK",
      } as ReqHeadRow);
  const canonicalItems = await loadCanonicalRequestItemsByRequestId(supabase, requestId);
  const rows = await materializeCanonicalRequestItems(supabase, head, canonicalItems);
  return {
    rows,
    sourceMeta: {
      primaryOwner: "degraded_direct_request_items",
      sourcePath: "degraded",
      fallbackUsed: true,
      sourceKind: WAREHOUSE_REQ_ITEMS_DIRECT_DEGRADED_SOURCE_KIND,
      contractVersion: "request_items_materialized_v1",
      reason,
    },
    meta: {
      requestId,
      returnedRowCount: rows.length,
      scopeKey: toReqItemsScopeKey(requestId, "degraded"),
      generatedAt: new Date().toISOString(),
      contractVersion: "request_items_materialized_v1",
    },
  };
}

export async function apiFetchReqItemsDetailed(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseReqItemsFetchResult> {
  const requestIdValue = String(requestId ?? "").trim();
  if (!requestIdValue) {
    return {
      rows: [],
      sourceMeta: {
        primaryOwner: "canonical_requests",
        sourcePath: "canonical",
        fallbackUsed: false,
        sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
        contractVersion: "request_lookup_v2",
        reason: null,
      },
      meta: {
        requestId: requestIdValue,
        returnedRowCount: 0,
        scopeKey: toReqItemsScopeKey(requestIdValue, "canonical"),
        generatedAt: new Date().toISOString(),
        contractVersion: "request_lookup_v2",
      },
    };
  }

  try {
    const [headLookup, canonicalItems] = await Promise.all([
      loadCanonicalRequestsByIds(supabase, [requestIdValue], { includeItemCounts: true }),
      loadCanonicalRequestItemsByRequestId(supabase, requestIdValue),
    ]);
    const head = headLookup.rows.length
      ? mapWarehouseCanonicalRequestToReqHeadRow(headLookup.rows[0])
      : null;
    const canonicalItemsById = new Map(canonicalItems.map((item) => [item.id, item]));
    const q = await supabase
      .from("v_wh_issue_req_items_ui")
      .select("*")
      .eq("request_id", requestIdValue)
      .order("name_human", { ascending: true });

    if (q.error) throw q.error;

    if (Array.isArray(q.data) && q.data.length) {
      const rows = mapWarehouseReqItemsFromView(
        asUnknownRows(q.data),
        canonicalItemsById,
        head ??
          ({
            request_id: requestIdValue,
            request_no: null,
            display_no: null,
            request_status: null,
            object_id: null,
            object_name: null,
            level_code: null,
            system_code: null,
            zone_code: null,
            submitted_at: null,
            items_cnt: 0,
            ready_cnt: 0,
            done_cnt: 0,
            qty_limit_sum: 0,
            qty_issued_sum: 0,
            qty_left_sum: 0,
            issue_status: "WAITING_STOCK",
          } as ReqHeadRow),
      );
      recordReqItemsTrace({
        result: "success",
        sourcePath: "canonical",
        sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
        requestId: requestIdValue,
        rowCount: rows.length,
        contractVersion: "request_lookup_v2",
      });
      return {
        rows,
        sourceMeta: {
          primaryOwner: "canonical_requests",
          sourcePath: "canonical",
          fallbackUsed: false,
          sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
          contractVersion: "request_lookup_v2",
          reason: null,
        },
        meta: {
          requestId: requestIdValue,
          returnedRowCount: rows.length,
          scopeKey: toReqItemsScopeKey(requestIdValue, "canonical"),
          generatedAt: headLookup.meta.generatedAt,
          contractVersion: headLookup.meta.contractVersion,
        },
      };
    }

    const materializedRows = await materializeCanonicalRequestItems(
      supabase,
      head ??
        ({
          request_id: requestIdValue,
          request_no: null,
          display_no: null,
          request_status: null,
          object_id: null,
          object_name: null,
          level_code: null,
          system_code: null,
          zone_code: null,
          submitted_at: null,
          items_cnt: canonicalItems.length,
          ready_cnt: canonicalItems.length,
          done_cnt: 0,
          qty_limit_sum: canonicalItems.reduce((sum, item) => sum + item.qty, 0),
          qty_issued_sum: 0,
          qty_left_sum: canonicalItems.reduce((sum, item) => sum + item.qty, 0),
          issue_status: "WAITING_STOCK",
        } as ReqHeadRow),
      canonicalItems,
    );
    recordReqItemsTrace({
      result: "success",
      sourcePath: "canonical",
      sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_MATERIALIZED_SOURCE_KIND,
      requestId: requestIdValue,
      rowCount: materializedRows.length,
      contractVersion: "request_items_materialized_v1",
      reason: "warehouse_view_missing_or_empty",
    });
    return {
      rows: materializedRows,
      sourceMeta: {
        primaryOwner: "canonical_requests",
        sourcePath: "canonical",
        fallbackUsed: false,
        sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_MATERIALIZED_SOURCE_KIND,
        contractVersion: "request_items_materialized_v1",
        reason: "warehouse_view_missing_or_empty",
      },
      meta: {
        requestId: requestIdValue,
        returnedRowCount: materializedRows.length,
        scopeKey: toReqItemsScopeKey(requestIdValue, "canonical"),
        generatedAt: headLookup.meta.generatedAt,
        contractVersion: "request_items_materialized_v1",
      },
    };
  } catch (canonicalError) {
    const canonicalMessage =
      canonicalError instanceof Error ? canonicalError.message : String(canonicalError ?? "unknown");
    recordReqItemsTrace({
      result: "error",
      sourcePath: "canonical",
      sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
      requestId: requestIdValue,
      rowCount: null,
      contractVersion: "request_lookup_v2",
      reason: canonicalMessage,
    });
    try {
      const compatibility = await apiFetchReqItemsCompatibilityRaw(
        supabase,
        requestIdValue,
        canonicalMessage,
      );
      recordReqItemsTrace({
        result: "success",
        sourcePath: compatibility.sourceMeta.sourcePath,
        sourceKind: compatibility.sourceMeta.sourceKind,
        requestId: requestIdValue,
        rowCount: compatibility.rows.length,
        contractVersion: compatibility.sourceMeta.contractVersion,
        reason: canonicalMessage,
      });
      return compatibility;
    } catch (compatibilityError) {
      const compatibilityMessage =
        compatibilityError instanceof Error
          ? compatibilityError.message
          : String(compatibilityError ?? "unknown");
      recordReqItemsTrace({
        result: "error",
        sourcePath: "compatibility",
        sourceKind: WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND,
        requestId: requestIdValue,
        rowCount: null,
        contractVersion: "view_ui_v1",
        reason: compatibilityMessage,
      });
      const degraded = await apiFetchReqItemsDegradedDirectRaw(
        supabase,
        requestIdValue,
        compatibilityMessage,
      );
      recordReqItemsTrace({
        result: "success",
        sourcePath: degraded.sourceMeta.sourcePath,
        sourceKind: degraded.sourceMeta.sourceKind,
        requestId: requestIdValue,
        rowCount: degraded.rows.length,
        contractVersion: degraded.sourceMeta.contractVersion,
        reason: compatibilityMessage,
      });
      return degraded;
    }
  }
}

export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  const result = await apiFetchReqItemsDetailed(supabase, requestId);
  return result.rows;
}

export {
  clearWarehouseRequestSourceTrace,
  readWarehouseRequestSourceTrace,
};
