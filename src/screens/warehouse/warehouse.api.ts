// src/screens/warehouse/warehouse.api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReqHeadRow, ReqItemUiRow, WarehouseReqHeadsIntegrityState } from "./warehouse.types";
import { isUuid, normMatCode, normUomId, parseNum, parseReqHeaderContext } from "./warehouse.utils";
import { normalizeRuText } from "../../lib/text/encoding";
import { beginPlatformObservability, recordPlatformObservability } from "../../lib/observability/platformObservability";
import { isRequestVisibleInWarehouseIssueQueue } from "../../lib/requestStatus";
import {
  asUnknownRows,
  fetchWarehouseRequestItemNoteRows,
  fetchWarehouseRequestMetaRows,
} from "./warehouse.api.repo";
import {
  compareWarehouseReqHeads,
  createHealthyWarehouseReqHeadsIntegrityState,
  repairWarehouseReqHeadsPage0,
} from "./warehouse.reqHeads.repair";
export type {
  IncomingMaterialsFastRow,
  IssuedByObjectFastRow,
  IssuedMaterialsFastRow,
  WarehouseStockFetchResult,
  WarehouseStockSourceMeta,
  WarehouseStockWindowMeta,
} from "./warehouse.stockReports.service";
export {
  apiEnrichStockNamesFromRikRu,
  apiEnsureIssueLines,
  apiFetchIncomingLines,
  apiFetchIncomingMaterialsReportFast,
  apiFetchIncomingReports,
  apiFetchIssuedByObjectReportFast,
  apiFetchIssuedMaterialsReportFast,
  apiFetchReports,
  apiFetchStock,
  apiFetchStockRpc,
  apiFetchStockRpcV2,
} from "./warehouse.stockReports.service";

type UnknownRow = Record<string, unknown>;
type RequestItemFallbackRow = {
  request_id: string;
  request_item_id: string;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  qty: number;
  status: string | null;
  note: string | null;
};
type StockAvailabilityMap = {
  byCode: Record<string, number>;
  byCodeUom: Record<string, number>;
};

const logWarehouseApiFallback = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    console.warn(`[warehouse.api] ${scope}:`, message);
  }
};

const toTextOrNull = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

const normalizeUuidList = (values: unknown[]): string[] =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(isUuid)));

const normalizeRequestItemStatus = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("Р С•РЎвЂљР С”Р В»Р С•Р Р…") || status.includes("reject");
};

const isIssuedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("Р Р†РЎвЂ№Р Т‘Р В°Р Р…") || status === "done";
};

const normalizeRequestItemFallbackRow = (row: UnknownRow): RequestItemFallbackRow => ({
  request_id: String(row.request_id ?? "").trim(),
  request_item_id: String(row.id ?? row.request_item_id ?? "").trim(),
  rik_code: toTextOrNull(row.rik_code),
  name_human: toTextOrNull(row.name_human),
  uom: toTextOrNull(row.uom),
  qty: Math.max(0, parseNum(row.qty, 0)),
  status: toTextOrNull(row.status),
  note: toTextOrNull(row.note),
});

const buildStockAvailabilityCodeKey = (raw: unknown): string =>
  String(normMatCode(raw ?? "")).trim().toUpperCase();

const buildStockAvailabilityCodeUomKey = (rawCode: unknown, rawUom: unknown): string => {
  const code = buildStockAvailabilityCodeKey(rawCode);
  const uom = String(normUomId(rawUom ?? "") ?? "")
    .trim()
    .toLowerCase();
  return `${code}::${uom || "-"}`;
};

type ReqHeadTruth = {
  items_cnt: number;
  ready_cnt: number;
  done_cnt: number;
  qty_limit_sum: number;
  qty_issued_sum: number;
  qty_left_sum: number;
  qty_can_issue_now_sum: number;
  issuable_now_cnt: number;
  issue_status: "READY" | "WAITING_STOCK" | "PARTIAL" | "DONE";
};

type ReqHeadQueueState = {
  visible_in_expense_queue: boolean;
  can_issue_now: boolean;
  waiting_stock: boolean;
  all_done: boolean;
};

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

export type WarehouseReqHeadsSourceMeta =
  | {
      primaryOwner: "rpc_scope_v4";
      fallbackUsed: false;
      sourceKind: "rpc:warehouse_issue_queue_scope_v4";
      contractVersion: string;
    }
  | {
      primaryOwner: "legacy_converged";
      fallbackUsed: true;
      sourceKind: "converged:req_heads";
      contractVersion: "legacy_converged";
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

type WarehouseReqHeadsLegacyFetchResult = {
  rows: ReqHeadRow[];
  metrics: ReqHeadsStageMetrics;
  meta: WarehouseReqHeadsWindowMeta & {
    contractVersion: "legacy_converged";
  };
  sourceMeta: {
    primaryOwner: "legacy_converged";
    fallbackUsed: true;
    sourceKind: "converged:req_heads";
    contractVersion: "legacy_converged";
  };
  integrityState: WarehouseReqHeadsIntegrityState;
};

const reqHeadsPerfNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND = "rpc:warehouse_issue_queue_scope_v4" as const;
const WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND = "converged:req_heads" as const;

const toReqHeadsScopeKey = (page: number, pageSize: number) =>
  `warehouse_issue_queue_scope_v4:${Math.max(0, page * pageSize)}:${pageSize}`;

const toReqHeadsContractVersion = (root: Record<string, unknown>, meta: Record<string, unknown>) =>
  toTextOrNull(root.version) ?? toTextOrNull(meta.payload_shape_version) ?? "v4";

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
    scopeKey: toTextOrNull(meta.scope_key) ?? toReqHeadsScopeKey(page, pageSize),
    generatedAt: toTextOrNull(meta.generated_at),
    contractVersion: toReqHeadsContractVersion(root, meta),
  };
};

const requireReqHeadsBoolean = (value: unknown, field: string): boolean => {
  if (typeof value === "boolean") return value;
  throw new Error(`warehouse_issue_queue_scope_v4 contract mismatch: ${field} must be boolean`);
};

const adaptReqHeadsRpcRow = (value: unknown, rowIndex: number): ReqHeadRow => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const requestId = String(row.request_id ?? row.id ?? "").trim();
  if (!requestId) {
    throw new Error(`warehouse_issue_queue_scope_v4 contract mismatch: rows[${rowIndex}].request_id is required`);
  }
  return {
    request_id: requestId,
    display_no: toTextOrNull(row.display_no),
    object_name: toTextOrNull(row.object_name),
    level_code: toTextOrNull(row.level_code),
    system_code: toTextOrNull(row.system_code),
    zone_code: toTextOrNull(row.zone_code),
    level_name: toTextOrNull(row.level_name),
    system_name: toTextOrNull(row.system_name),
    zone_name: toTextOrNull(row.zone_name),
    contractor_name: toTextOrNull(row.contractor_name),
    contractor_phone: toTextOrNull(row.contractor_phone),
    planned_volume: toTextOrNull(row.planned_volume),
    note: toTextOrNull(row.note),
    comment: toTextOrNull(row.comment),
    submitted_at: toTextOrNull(row.submitted_at),
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

function finalizeReqHeadTruth(agg: Omit<ReqHeadTruth, "issue_status">): ReqHeadTruth {
  const qtyLeft = Math.max(0, agg.qty_left_sum);
  const qtyCanIssueNow = Math.max(0, agg.qty_can_issue_now_sum);
  let issueStatus: ReqHeadTruth["issue_status"] = "WAITING_STOCK";
  if (qtyLeft <= 0) issueStatus = "DONE";
  else if (qtyCanIssueNow > 0) issueStatus = "READY";
  else if (agg.qty_issued_sum > 0) issueStatus = "PARTIAL";
  return {
    ...agg,
    qty_left_sum: qtyLeft,
    qty_can_issue_now_sum: qtyCanIssueNow,
    issue_status: issueStatus,
  };
}

function deriveReqHeadQueueState(row: Pick<
  ReqHeadRow,
  "qty_left_sum" | "qty_can_issue_now_sum" | "issue_status"
>): ReqHeadQueueState {
  const qtyLeft = Math.max(0, parseNum(row.qty_left_sum, 0));
  const qtyCanIssueNow = Math.max(0, parseNum(row.qty_can_issue_now_sum, 0));
  const all_done = String(row.issue_status ?? "").trim().toUpperCase() === "DONE" || qtyLeft <= 0;
  const visible_in_expense_queue = !all_done && qtyLeft > 0;
  const can_issue_now = visible_in_expense_queue && qtyCanIssueNow > 0;
  const waiting_stock = visible_in_expense_queue && !can_issue_now;
  return {
    visible_in_expense_queue,
    can_issue_now,
    waiting_stock,
    all_done,
  };
}

function applyReqHeadQueueState(row: ReqHeadRow): ReqHeadRow {
  return {
    ...row,
    ...deriveReqHeadQueueState(row),
  };
}

function applyReqHeadTruth(row: ReqHeadRow, truth?: ReqHeadTruth): ReqHeadRow {
  const next = truth
    ? {
        ...row,
        items_cnt: truth.items_cnt,
        ready_cnt: truth.ready_cnt,
        done_cnt: truth.done_cnt,
        qty_limit_sum: truth.qty_limit_sum,
        qty_issued_sum: truth.qty_issued_sum,
        qty_left_sum: truth.qty_left_sum,
        qty_can_issue_now_sum: truth.qty_can_issue_now_sum,
        issuable_now_cnt: truth.issuable_now_cnt,
        issue_status: truth.issue_status,
      }
    : row;
  return applyReqHeadQueueState(next);
}

function aggregateReqItemTruthRows(rows: UnknownRow[]): Record<string, ReqHeadTruth> {
  const byReq: Record<
    string,
    Record<
      string,
      {
        qty_limit: number;
        qty_issued: number;
        qty_left: number;
        qty_can_issue_now: number;
      }
    >
  > = {};

  for (const row of rows) {
    const requestId = String(row?.request_id ?? "").trim();
    const requestItemId = String(row?.request_item_id ?? "").trim();
    if (!requestId || !requestItemId) continue;
    if (!byReq[requestId]) byReq[requestId] = {};

    const prev = byReq[requestId][requestItemId];
    const next = {
      qty_limit: parseNum(row?.qty_limit, 0),
      qty_issued: parseNum(row?.qty_issued, 0),
      qty_left: parseNum(row?.qty_left, 0),
      qty_can_issue_now: parseNum(row?.qty_can_issue_now, 0),
    };

    if (!prev) {
      byReq[requestId][requestItemId] = next;
      continue;
    }

    byReq[requestId][requestItemId] = {
      qty_limit: Math.max(prev.qty_limit, next.qty_limit),
      qty_issued: Math.max(prev.qty_issued, next.qty_issued),
      qty_left: Math.max(prev.qty_left, next.qty_left),
      qty_can_issue_now: Math.max(prev.qty_can_issue_now, next.qty_can_issue_now),
    };
  }

  const out: Record<string, ReqHeadTruth> = {};
  for (const [requestId, itemMap] of Object.entries(byReq)) {
    const items = Object.values(itemMap);
    const agg = items.reduce(
      (acc, item) => {
        const left = Math.max(0, item.qty_left);
        const canIssueNow = Math.max(0, Math.min(left, item.qty_can_issue_now));
        acc.items_cnt += 1;
        acc.ready_cnt += left > 0 ? 1 : 0;
        acc.done_cnt += left <= 0 && item.qty_limit > 0 ? 1 : 0;
        acc.qty_limit_sum += Math.max(0, item.qty_limit);
        acc.qty_issued_sum += Math.max(0, item.qty_issued);
        acc.qty_left_sum += left;
        acc.qty_can_issue_now_sum += canIssueNow;
        acc.issuable_now_cnt += left > 0 && canIssueNow > 0 ? 1 : 0;
        return acc;
      },
      {
        items_cnt: 0,
        ready_cnt: 0,
        done_cnt: 0,
        qty_limit_sum: 0,
        qty_issued_sum: 0,
        qty_left_sum: 0,
        qty_can_issue_now_sum: 0,
        issuable_now_cnt: 0,
      },
    );
    out[requestId] = finalizeReqHeadTruth(agg);
  }

  return out;
}

function aggregateReqItemUiRows(rows: ReqItemUiRow[]): Record<string, ReqHeadTruth> {
  return aggregateReqItemTruthRows(
    rows.map((row) => ({
      request_id: row.request_id,
      request_item_id: row.request_item_id,
      qty_limit: row.qty_limit,
      qty_issued: row.qty_issued,
      qty_left: row.qty_left,
      qty_can_issue_now: row.qty_can_issue_now,
    })),
  );
}

async function loadFallbackStockAvailability(
  supabase: SupabaseClient,
  rows: RequestItemFallbackRow[],
): Promise<StockAvailabilityMap> {
  const codes = Array.from(
    new Set(
      rows
        .map((row) => buildStockAvailabilityCodeKey(row.rik_code))
        .filter(Boolean),
    ),
  );
  if (!codes.length) return { byCode: {}, byCodeUom: {} };

  const q = await supabase
    .from("v_warehouse_stock")
    .select("rik_code, uom_id, qty_available")
    .in("rik_code", codes);

  if (q.error || !Array.isArray(q.data) || !q.data.length) {
    return { byCode: {}, byCodeUom: {} };
  }

  const byCode: Record<string, number> = {};
  const byCodeUom: Record<string, number> = {};
  for (const raw of q.data as UnknownRow[]) {
    const codeKey = buildStockAvailabilityCodeKey(raw.rik_code);
    if (!codeKey) continue;
    const qty = Math.max(0, parseNum(raw.qty_available, 0));
    byCode[codeKey] = (byCode[codeKey] ?? 0) + qty;
    const key = buildStockAvailabilityCodeUomKey(raw.rik_code, raw.uom_id);
    byCodeUom[key] = (byCodeUom[key] ?? 0) + qty;
  }

  return { byCode, byCodeUom };
}

function materializeFallbackReqItems(
  rows: RequestItemFallbackRow[],
  stockAvailability: StockAvailabilityMap,
): ReqItemUiRow[] {
  const remainingByCode = { ...stockAvailability.byCode };
  const remainingByCodeUom = { ...stockAvailability.byCodeUom };

  return rows
    .filter((row) => !isRejectedRequestItemStatus(row.status))
    .sort((a, b) => {
      const reqCmp = String(a.request_id ?? "").localeCompare(String(b.request_id ?? ""));
      if (reqCmp !== 0) return reqCmp;
      const nameCmp = String(a.name_human ?? "").localeCompare(String(b.name_human ?? ""));
      if (nameCmp !== 0) return nameCmp;
      return String(a.request_item_id ?? "").localeCompare(String(b.request_item_id ?? ""));
    })
    .map((row) => {
      const qtyLimit = Math.max(0, row.qty);
      const issued = isIssuedRequestItemStatus(row.status) ? qtyLimit : 0;
      const qtyLeft = Math.max(0, qtyLimit - issued);
      const codeKey = buildStockAvailabilityCodeKey(row.rik_code);
      const codeUomKey = buildStockAvailabilityCodeUomKey(row.rik_code, row.uom);

      const exactAvailable = stockAvailability.byCodeUom[codeUomKey];
      const totalAvailable = exactAvailable ?? stockAvailability.byCode[codeKey] ?? 0;
      const remainingAvailable =
        exactAvailable != null
          ? remainingByCodeUom[codeUomKey] ?? totalAvailable
          : remainingByCode[codeKey] ?? totalAvailable;
      const qtyCanIssueNow = Math.max(0, Math.min(qtyLeft, remainingAvailable));

      if (exactAvailable != null) {
        remainingByCodeUom[codeUomKey] = Math.max(0, remainingAvailable - qtyCanIssueNow);
      } else if (codeKey) {
        remainingByCode[codeKey] = Math.max(0, remainingAvailable - qtyCanIssueNow);
      }

      return {
        request_id: row.request_id,
        request_item_id: row.request_item_id,
        display_no: null,
        object_name: null,
        level_code: null,
        system_code: null,
        zone_code: null,
        rik_code: String(row.rik_code ?? ""),
        name_human: String(row.name_human ?? row.rik_code ?? ""),
        uom: row.uom,
        qty_limit: qtyLimit,
        qty_issued: issued,
        qty_left: qtyLeft,
        qty_available: Math.max(0, totalAvailable),
        qty_can_issue_now: qtyCanIssueNow,
      };
    });
}

async function loadReqHeadTruthByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Record<string, ReqHeadTruth>> {
  const ids = Array.from(new Set(requestIds.map((x) => String(x || "").trim()).filter(Boolean)));
  if (!ids.length) return {};

  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("request_id, request_item_id, qty_limit, qty_issued, qty_left, qty_can_issue_now")
    .in("request_id", ids);

  if (q.error || !Array.isArray(q.data) || q.data.length === 0) return {};
  return aggregateReqItemTruthRows(q.data as UnknownRow[]);
}

function mapReqHeadViewRow(x: UnknownRow): ReqHeadRow {
  return {
    request_id: String(x.request_id),
    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),
    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),
    level_name: toTextOrNull(x.level_name),
    system_name: toTextOrNull(x.system_name),
    zone_name: toTextOrNull(x.zone_name),
    contractor_name: toTextOrNull(x.contractor_name ?? x.contractor_org ?? x.subcontractor_name),
    contractor_phone: toTextOrNull(x.contractor_phone ?? x.phone ?? x.phone_number),
    planned_volume: toTextOrNull(x.planned_volume ?? x.volume ?? x.qty_plan),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),
    submitted_at: toTextOrNull(x.submitted_at),
    items_cnt: Number(x.items_cnt ?? 0),
    ready_cnt: Number(x.ready_cnt ?? 0),
    done_cnt: Number(x.done_cnt ?? 0),
    qty_limit_sum: parseNum(x.qty_limit_sum, 0),
    qty_issued_sum: parseNum(x.qty_issued_sum, 0),
    qty_left_sum: parseNum(x.qty_left_sum, 0),
    qty_can_issue_now_sum: parseNum(x.qty_can_issue_now_sum, 0),
    issuable_now_cnt: parseNum(x.issuable_now_cnt, 0),
    issue_status: String(x.issue_status ?? "READY"),
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

  const rows: ReqHeadRow[] = (q.data as UnknownRow[]).map(mapReqHeadViewRow);

  rows.sort(compareWarehouseReqHeads);

  const requestIds = Array.from(
    new Set(rows.map((r) => String(r.request_id ?? "").trim()).filter(Boolean)),
  );
  const safeRequestIds = normalizeUuidList(requestIds);
  if (!safeRequestIds.length) return [];

  const approvalStatusRows = await supabase
    .from("requests")
    .select("id, status")
    .in("id", safeRequestIds);
  if (approvalStatusRows.error || !Array.isArray(approvalStatusRows.data)) return [];

  const requestStatusById = new Map<string, string>();
  for (const row of approvalStatusRows.data as UnknownRow[]) {
    const id = String(row?.id ?? "").trim();
    if (!id) continue;
    requestStatusById.set(id, String(row?.status ?? ""));
  }

  const approvedRows = rows.filter((row) =>
    isRequestVisibleInWarehouseIssueQueue(
      requestStatusById.get(String(row.request_id ?? "").trim()) || "",
    ),
  );
  return approvedRows;
}

async function loadApprovedViewReqHeadsWindow(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<ReqHeadRow[]> {
  const approvedRows = await loadApprovedViewReqHeadsWindowRows(supabase, offset, limit);
  if (!approvedRows.length) return [];

  const truthByReq = await loadReqHeadTruthByRequestIds(
    supabase,
    approvedRows.map((row) => row.request_id),
  );

  return approvedRows
    .map((row) => applyReqHeadTruth(row, truthByReq[String(row.request_id ?? "").trim()]))
    .filter((row) => row.visible_in_expense_queue);
}

async function enrichReqHeadsMeta(
  supabase: SupabaseClient,
  rows: ReqHeadRow[],
): Promise<ReqHeadRow[]> {
  const idsNeedMeta = rows
    .filter(
      (r) =>
        !String(r.contractor_name ?? "").trim() ||
        !String(r.contractor_phone ?? "").trim() ||
        !String(r.planned_volume ?? "").trim(),
    )
    .map((r) => String(r.request_id ?? "").trim())
    .filter(isUuid);

  if (!idsNeedMeta.length) return rows;

  const [reqQ, itemQ] = await Promise.all([
    fetchWarehouseRequestMetaRows(supabase, idsNeedMeta),
    fetchWarehouseRequestItemNoteRows(supabase, idsNeedMeta),
  ]);

  const reqById: Record<string, UnknownRow> = {};
  if (!reqQ.error && Array.isArray(reqQ.data)) {
    for (const r of reqQ.data as UnknownRow[]) {
      const id = String(r?.id ?? "").trim();
      if (id) reqById[id] = r;
    }
  }

  const itemNotesByReq: Record<string, string[]> = {};
  if (!itemQ.error && Array.isArray(itemQ.data)) {
    for (const it of itemQ.data as UnknownRow[]) {
      const rid = String(it?.request_id ?? "").trim();
      if (!rid) continue;
      const note = String(it?.note ?? "").trim();
      if (!note) continue;
      if (!itemNotesByReq[rid]) itemNotesByReq[rid] = [];
      itemNotesByReq[rid].push(note);
    }
  }

  const pickVal = (obj: UnknownRow | undefined, keys: string[]) => {
    for (const k of keys) {
      const v = String(obj?.[k] ?? "").trim();
      if (v) return v;
    }
    return "";
  };
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };

  return rows.map((row) => {
    const rid = String(row.request_id ?? "").trim();
    const req = reqById[rid];
    if (!req) return row;

    const fromReqText = parseReqHeaderContext([
      String(req?.note ?? ""),
      String(req?.comment ?? ""),
    ]);
    const fromItemText = parseReqHeaderContext(itemNotesByReq[rid] ?? []);

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
      note: row.note ?? toTextOrNull(req?.note),
      comment: row.comment ?? toTextOrNull(req?.comment),
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

  let mergedRows = [...visibleViewRows].sort(compareWarehouseReqHeads);
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
      logWarehouseApiFallback("apiFetchReqHeads/fallback-load", error);
      integrityState = {
        mode: mergedRows.length > 0 ? "stale_last_known_good" : "error",
        reason: "req_heads_repair_failed",
        message: error instanceof Error ? error.message : String(error ?? "unknown"),
        cacheUsed: mergedRows.length > 0,
      };
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
    logWarehouseApiFallback("apiFetchReqHeads/enrich-view", error);
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

/**
 * Р В Р вЂ Р РЋРЎв„ўР Р†Р вЂљР’В¦ PROD stock
 * - qty: v_wh_balance_ledger_truth_ui (Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚ВР В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’В°)
 * - name: overrides -> v_rik_names_ru -> v_wh_balance_ledger_ui
 */
async function apiFetchReqHeadsLegacyRaw(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
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
      scopeKey: `warehouse_issue_queue_legacy:${Math.max(0, page * pageSize)}:${pageSize}`,
      generatedAt: null,
      contractVersion: "legacy_converged",
    },
    sourceMeta: {
      primaryOwner: "legacy_converged",
      fallbackUsed: true,
      sourceKind: WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND,
      contractVersion: "legacy_converged",
    },
    integrityState: legacy.integrityState,
  };
}

async function apiFetchReqHeadsLegacy(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
): Promise<WarehouseReqHeadsLegacyFetchResult> {
  const observation = beginPlatformObservability({
    screen: "warehouse",
    surface: "req_heads",
    category: "fetch",
    event: "fetch_req_heads_legacy",
    sourceKind: WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND,
  });
  try {
    const result = await apiFetchReqHeadsLegacyRaw(supabase, page, pageSize);
    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: result.sourceMeta.fallbackUsed,
      extra: {
        page,
        pageSize,
        primaryOwner: result.sourceMeta.primaryOwner,
        stageB_ms: result.metrics.stage_b_ms,
        repairedMissingIdsCount: result.meta.repairedMissingIdsCount,
        hasMore: result.meta.hasMore,
        integrityMode: result.integrityState.mode,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "fetch_req_heads_legacy",
      extra: { page, pageSize },
    });
    throw error;
  }
}
void apiFetchReqHeadsLegacy;

async function apiFetchReqHeadsRpcRaw(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50,
): Promise<WarehouseReqHeadsFetchResult> {
  const offset = Math.max(0, page * pageSize);
  const { data, error } = await supabase.rpc("warehouse_issue_queue_scope_v4", {
    p_offset: offset,
    p_limit: pageSize,
  });
  if (error) throw error;

  const root = data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
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
    meta,
    sourceMeta: {
      primaryOwner: "rpc_scope_v4",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
      contractVersion: meta.contractVersion,
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
    sourceKind: WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
  });
  try {
    const result = await apiFetchReqHeadsRpcRaw(supabase, page, pageSize);
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
        append: page > 0,
        refresh: page === 0,
        primaryOwner: result.sourceMeta.primaryOwner,
        totalRowCount: result.meta.totalRowCount,
        hasMore: result.meta.hasMore,
        repairedMissingIdsCount: result.meta.repairedMissingIdsCount,
        enrichedRowsCount: result.metrics.enriched_rows_count,
        integrityMode: result.integrityState.mode,
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    recordPlatformObservability({
      screen: "warehouse",
      surface: "req_heads",
      category: "fetch",
      event: "fetch_req_heads_rpc_v4_failed",
      result: "error",
      sourceKind: WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
      fallbackUsed: true,
      errorStage: "fetch_req_heads_rpc_v4",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: message || undefined,
      extra: {
        page,
        pageSize,
        pageOffset: Math.max(0, page * pageSize),
        scopeKey: toReqHeadsScopeKey(page, pageSize),
        append: page > 0,
        refresh: page === 0,
      },
    });
    try {
      const fallbackResult = await apiFetchReqHeadsLegacy(supabase, page, pageSize);
      observation.success({
        rowCount: fallbackResult.rows.length,
        sourceKind: fallbackResult.sourceMeta.sourceKind,
        fallbackUsed: true,
        extra: {
          page,
          pageSize,
          pageOffset: fallbackResult.meta.pageOffset,
          scopeKey: fallbackResult.meta.scopeKey,
          contractVersion: fallbackResult.meta.contractVersion,
          generatedAt: fallbackResult.meta.generatedAt,
          append: page > 0,
          refresh: page === 0,
          primaryOwner: fallbackResult.sourceMeta.primaryOwner,
          totalRowCount: fallbackResult.meta.totalRowCount,
          hasMore: fallbackResult.meta.hasMore,
          repairedMissingIdsCount: fallbackResult.meta.repairedMissingIdsCount,
          enrichedRowsCount: fallbackResult.metrics.enriched_rows_count,
          fallbackReason: message,
          integrityMode: fallbackResult.integrityState.mode,
        },
      });
      return fallbackResult;
    } catch (legacyError) {
      observation.error(legacyError, {
        rowCount: 0,
        errorStage: "fetch_req_heads_legacy_hard_cut",
        fallbackUsed: true,
        extra: {
          page,
          pageSize,
          pageOffset: Math.max(0, page * pageSize),
          scopeKey: toReqHeadsScopeKey(page, pageSize),
          append: page > 0,
          refresh: page === 0,
          fallbackReason: message,
        },
      });
      throw legacyError;
    }
  }
}

export async function apiFetchReqHeads(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50
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
    stage_b_ms: 0,
  };
  recordPlatformObservability({
    screen: "warehouse",
    surface: "req_heads",
    category: "fetch",
    event: "fetch_req_heads_stage_a",
    result: "success",
    durationMs: baseMetrics.stage_a_ms,
    rowCount: primary.rows.length,
    sourceKind: primary.sourceMeta.sourceKind,
    fallbackUsed: primary.sourceMeta.fallbackUsed,
    extra: {
      page,
      pageSize,
      primaryOwner: primary.sourceMeta.primaryOwner,
      hasMore: primary.meta.hasMore,
      repairedMissingIdsCount: primary.meta.repairedMissingIdsCount,
    },
  });

  return {
    baseRows: primary.rows,
    meta: primary.meta,
    sourceMeta: primary.sourceMeta,
    metrics: baseMetrics,
    finalRowsPromise: Promise.resolve({
      ...primary,
      metrics: baseMetrics,
    }).then((result) => {
      recordPlatformObservability({
        screen: "warehouse",
        surface: "req_heads",
        category: "fetch",
        event: "fetch_req_heads_stage_b",
        result: "success",
        durationMs: result.metrics.stage_b_ms,
        rowCount: result.rows.length,
        sourceKind: result.sourceMeta.sourceKind,
        fallbackUsed: result.sourceMeta.fallbackUsed,
        extra: {
          page,
          pageSize,
          primaryOwner: result.sourceMeta.primaryOwner,
          hasMore: result.meta.hasMore,
          repairedMissingIdsCount: result.meta.repairedMissingIdsCount,
          enrichedRowsCount: result.metrics.enriched_rows_count,
        },
      });
      return result;
    }),
  };
}
export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };
  const rid = String(requestId || "").trim();
  if (!rid) return [];

  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .eq("request_id", rid)
    .order("name_human", { ascending: true });

  if (q.error || !Array.isArray(q.data)) {
    return [];
  }

  let raw: ReqItemUiRowWithMeta[] = (q.data as UnknownRow[]).map((x) => ({
    request_id: String(x.request_id),
    request_item_id: String(x.request_item_id),

    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),
    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),

    rik_code: String(x.rik_code ?? ""),
    name_human: String(x.name_human ?? x.rik_code ?? ""),
    uom: toTextOrNull(x.uom),

    qty_limit: parseNum(x.qty_limit, 0),
    qty_issued: parseNum(x.qty_issued, 0),
    qty_left: parseNum(x.qty_left, 0),

    qty_available: parseNum(x.qty_available, 0),
    qty_can_issue_now: parseNum(x.qty_can_issue_now, 0),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),
  }));

  // Enrich notes from base request_items table (view may not expose note/comment).
  try {
      const ids = raw
        .map((x) => String(x.request_item_id ?? "").trim())
        .filter(isUuid);
    if (ids.length) {
      const nQ = await supabase
        .from("request_items")
        .select("id, note")
        .in("id", ids);
      if (!nQ.error && Array.isArray(nQ.data) && nQ.data.length) {
        const byId: Record<string, { note: string | null }> = {};
        for (const r of nQ.data as UnknownRow[]) {
          const id = String(r?.id ?? "").trim();
          if (!id) continue;
          byId[id] = {
            note: r?.note == null ? null : String(r.note),
          };
        }
        raw = raw.map((it) => {
          const id = String(it.request_item_id ?? "").trim();
          const p = byId[id];
          if (!p) return it;
          return {
            ...it,
            note: it.note ?? p.note ?? null,
            comment: it.comment ?? null,
          };
        });
      }
    }
  } catch (error) {
    logWarehouseApiFallback("apiFetchReqItems/enrich-notes", error);
    // keep base rows if enrichment fails
  }

  // Р В Р вЂ Р РЋРЎв„ўР Р†Р вЂљР’В¦ Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р СћРІР‚ВР В Р Р‹Р РЋРІР‚СљР В Р’В Р РЋРІР‚вЂќ Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚Сћ request_item_id (Р В Р’В Р вЂ™Р’В±Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р РЋР’В Р В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚СњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°Р В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р’В Р вЂ™Р’Вµ Р В Р Р‹Р Р†Р вЂљР Р‹Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’В»Р В Р’В Р вЂ™Р’В°)
  const byId: Record<string, ReqItemUiRowWithMeta> = {};
  for (const it of raw) {
    const id = String(it.request_item_id ?? "").trim();
    if (!id) continue;

    const prev = byId[id];
    if (!prev) {
      byId[id] = it;
      continue;
    }

    const merged: ReqItemUiRowWithMeta = { ...prev };
    const pickText = (a: unknown, b: unknown): string | null => {
      const sa = String(a ?? "").trim();
      if (sa) return sa;
      const sb = String(b ?? "").trim();
      return sb || null;
    };

    merged.name_human = pickText(prev.name_human, it.name_human) ?? "";
    merged.rik_code = pickText(prev.rik_code, it.rik_code) ?? "";
    merged.uom = pickText(prev.uom, it.uom);
    merged.note = pickText(prev.note, it.note);
    merged.comment = pickText(prev.comment, it.comment);

    merged.qty_limit = Math.max(parseNum(prev.qty_limit, 0), parseNum(it.qty_limit, 0));
    merged.qty_issued = Math.max(parseNum(prev.qty_issued, 0), parseNum(it.qty_issued, 0));
    merged.qty_left = Math.max(parseNum(prev.qty_left, 0), parseNum(it.qty_left, 0));
    merged.qty_available = Math.max(parseNum(prev.qty_available, 0), parseNum(it.qty_available, 0));
    merged.qty_can_issue_now = Math.max(
      parseNum(prev.qty_can_issue_now, 0),
      parseNum(it.qty_can_issue_now, 0),
    );

    byId[id] = merged;
  }

  const viewItems = Object.values(byId).sort((a, b) =>
    String(a.name_human ?? "").localeCompare(String(b.name_human ?? "")),
  );

  if (viewItems.length > 0) return viewItems;

  // Fallback for requests not yet materialized in warehouse view.
  try {
    const f = await supabase
      .from("request_items")
      .select("id, request_id, rik_code, name_human, uom, qty, status, note")
      .eq("request_id", rid)
      .order("name_human", { ascending: true });
    if (!f.error && Array.isArray(f.data) && f.data.length) {
      const normalizedFallbackRows = asUnknownRows(f.data).map(normalizeRequestItemFallbackRow);
      const stockAvailability = await loadFallbackStockAvailability(supabase, normalizedFallbackRows);
      const direct = materializeFallbackReqItems(normalizedFallbackRows, stockAvailability);
      return direct;
    }
  } catch (error) {
    logWarehouseApiFallback("apiFetchReqItems/fallback-direct", error);
  }

  return viewItems;
}
