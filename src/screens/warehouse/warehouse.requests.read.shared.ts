import type { ReqHeadRow, ReqItemUiRow, WarehouseReqHeadsIntegrityState } from "./warehouse.types";
import { parseNum } from "./warehouse.request.utils";
import { toWarehouseTextOrNull } from "./warehouse.adapters";
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

export type WarehouseReqHeadsSourceMeta = {
  primaryOwner: "canonical_issue_queue_rpc";
  sourcePath: WarehouseRequestSourcePath;
  fallbackUsed: false;
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
  primaryOwner: "canonical_issue_items_rpc";
  sourcePath: WarehouseRequestSourcePath;
  fallbackUsed: false;
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

export type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };

export const WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND = "rpc:warehouse_issue_queue_scope_v4" as const;
export const WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND = "rpc:warehouse_issue_queue_scope_v4" as const;
export const WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND = "rpc:warehouse_issue_items_scope_v1" as const;

export const reqHeadsPerfNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

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
    scopeKey: toWarehouseTextOrNull(meta.scope_key) ?? toReqHeadsScopeKey(page, pageSize, "canonical"),
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

export { clearWarehouseRequestSourceTrace, readWarehouseRequestSourceTrace };
