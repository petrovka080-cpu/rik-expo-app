import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applySupabaseAbortSignal,
  throwIfAborted,
} from "../../lib/requestCancellation";
import { trackRpcLatency } from "../../lib/observability/rpcLatencyMetrics";
import {
  isRpcRowsEnvelope,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";

import { createHealthyWarehouseReqHeadsIntegrityState } from "./warehouse.reqHeads.state";
import { parseNum } from "./warehouse.request.utils";
import {
  WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
  adaptReqHeadsRpcRow,
  toReqHeadsRpcMeta,
  toReqHeadsScopeKey,
  toReqItemsScopeKey,
  type ReqItemUiRowWithMeta,
  type WarehouseReqHeadsFetchResult,
  type WarehouseReqItemsFetchResult,
} from "./warehouse.requests.read.shared";
import { toWarehouseTextOrNull } from "./warehouse.adapters";

export const WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 };

const toNonNegativeInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

export const normalizeWarehouseIssueQueuePage = (
  page: number,
  pageSize: number,
): { page: number; pageSize: number; offset: number } => {
  const normalizedPage = toNonNegativeInt(page, 0);
  const maxPageSize = Math.max(1, WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS.maxPageSize);
  const defaultPageSize = Math.min(
    maxPageSize,
    Math.max(1, WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS.pageSize),
  );
  const normalizedPageSize = Math.min(
    Math.max(1, toNonNegativeInt(pageSize, defaultPageSize)),
    maxPageSize,
  );

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    offset: normalizedPage * normalizedPageSize,
  };
};

const requireRpcRows = (value: unknown, rpcName: string): unknown[] => {
  const root = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  if (!Array.isArray(root.rows)) {
    throw new Error(`${rpcName} contract mismatch: rows must be an array`);
  }
  return root.rows;
};

const requireBoundedRpcRows = (value: unknown, rpcName: string, limit: number): unknown[] => {
  const rows = requireRpcRows(value, rpcName);
  const maxRows = Math.max(0, Math.trunc(Number(limit) || 0));
  if (rows.length > maxRows) {
    throw new Error(`${rpcName} contract mismatch: rows length exceeds p_limit`);
  }
  return rows;
};

const dedupeReqHeadRawRows = (rows: unknown[]): unknown[] => {
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const row of rows) {
    const record = row && typeof row === "object" && !Array.isArray(row)
      ? (row as Record<string, unknown>)
      : null;
    const requestId = String(record?.request_id ?? record?.id ?? "").trim();
    if (!requestId) {
      result.push(row);
      continue;
    }
    if (seen.has(requestId)) continue;
    seen.add(requestId);
    result.push(row);
  }
  return result;
};

const toReqItemsMeta = (
  value: unknown,
  requestId: string,
  returnedRowCount: number,
): WarehouseReqItemsFetchResult["meta"] => {
  const root = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const meta = root.meta && typeof root.meta === "object" && !Array.isArray(root.meta)
    ? (root.meta as Record<string, unknown>)
    : {};

  return {
    requestId,
    returnedRowCount: Math.max(0, Number(meta.row_count ?? returnedRowCount) || 0),
    scopeKey: toWarehouseTextOrNull(meta.scope_key) ?? toReqItemsScopeKey(requestId, "canonical"),
    generatedAt: toWarehouseTextOrNull(meta.generated_at),
    contractVersion:
      toWarehouseTextOrNull(root.version) ??
      toWarehouseTextOrNull(meta.payload_shape_version) ??
      "v1",
  };
};

const adaptReqItemsRpcRow = (
  value: unknown,
  requestId: string,
  rowIndex: number,
): ReqItemUiRowWithMeta => {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const requestItemId = String(row.request_item_id ?? "").trim();
  if (!requestItemId) {
    throw new Error(`warehouse_issue_items_scope_v1 contract mismatch: rows[${rowIndex}].request_item_id is required`);
  }

  return {
    request_id: String(row.request_id ?? requestId).trim() || requestId,
    request_item_id: requestItemId,
    display_no: toWarehouseTextOrNull(row.display_no),
    object_name: toWarehouseTextOrNull(row.object_name),
    level_code: toWarehouseTextOrNull(row.level_code),
    system_code: toWarehouseTextOrNull(row.system_code),
    zone_code: toWarehouseTextOrNull(row.zone_code),
    level_name: toWarehouseTextOrNull(row.level_name),
    system_name: toWarehouseTextOrNull(row.system_name),
    zone_name: toWarehouseTextOrNull(row.zone_name),
    rik_code: String(row.rik_code ?? "").trim(),
    name_human: String(row.name_human ?? row.rik_code ?? "").trim(),
    uom: toWarehouseTextOrNull(row.uom),
    qty_limit: parseNum(row.qty_limit, 0),
    qty_issued: parseNum(row.qty_issued, 0),
    qty_left: parseNum(row.qty_left, 0),
    qty_available: parseNum(row.qty_available, 0),
    qty_can_issue_now: parseNum(row.qty_can_issue_now, 0),
    note: toWarehouseTextOrNull(row.note),
    comment: toWarehouseTextOrNull(row.comment),
  };
};

export async function apiFetchReqHeadsCanonicalRaw(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseReqHeadsFetchResult> {
  const normalizedPage = normalizeWarehouseIssueQueuePage(page, pageSize);
  const offset = normalizedPage.offset;
  throwIfAborted(options?.signal);
  const startedAt = Date.now();
  const { data, error } = await applySupabaseAbortSignal(
    supabase.rpc("warehouse_issue_queue_scope_v4", {
      p_offset: offset,
      p_limit: normalizedPage.pageSize,
    }),
    options?.signal,
  );
  throwIfAborted(options?.signal);
  if (error) {
    trackRpcLatency({
      name: "warehouse_issue_queue_scope_v4",
      screen: "warehouse",
      surface: "issue_queue",
      durationMs: Date.now() - startedAt,
      status: "error",
      error,
      extra: { page: normalizedPage.page, pageSize: normalizedPage.pageSize, offset },
    });
    throw error;
  }

  const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "warehouse_issue_queue_scope_v4",
    caller: "apiFetchReqHeadsCanonicalRaw",
    domain: "warehouse",
  });
  const rows = requireBoundedRpcRows(
    validated,
    "warehouse_issue_queue_scope_v4",
    normalizedPage.pageSize,
  );
  const dedupedRows = dedupeReqHeadRawRows(rows);
  const adaptedRows = dedupedRows.map((row, index) => adaptReqHeadsRpcRow(row, index));
  const meta = toReqHeadsRpcMeta(
    validated,
    normalizedPage.page,
    normalizedPage.pageSize,
    adaptedRows.length,
  );
  trackRpcLatency({
    name: "warehouse_issue_queue_scope_v4",
    screen: "warehouse",
    surface: "issue_queue",
    durationMs: Date.now() - startedAt,
    status: "success",
    rowCount: adaptedRows.length,
    extra: {
      page: normalizedPage.page,
      pageSize: normalizedPage.pageSize,
      offset,
      totalRowCount: meta.totalRowCount,
    },
  });

  return {
    rows: adaptedRows,
    metrics: {
      stage_a_ms: 0,
      stage_b_ms: 0,
      fallback_missing_ids_count: 0,
      enriched_rows_count: 0,
      page0_required_repair: false,
    },
    meta: {
      ...meta,
      scopeKey: toReqHeadsScopeKey(normalizedPage.page, normalizedPage.pageSize, "canonical"),
    },
    sourceMeta: {
      primaryOwner: "canonical_issue_queue_rpc",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      contractVersion: meta.contractVersion,
      reason: null,
    },
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
  };
}

export async function apiFetchReqItemsCanonicalRaw(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseReqItemsFetchResult> {
  const { data, error } = await supabase.rpc("warehouse_issue_items_scope_v1", {
    p_request_id: requestId,
  });
  if (error) throw error;

  const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "warehouse_issue_items_scope_v1",
    caller: "apiFetchReqItemsCanonicalRaw",
    domain: "warehouse",
  });
  const rows = requireRpcRows(validated, "warehouse_issue_items_scope_v1").map((row, index) =>
    adaptReqItemsRpcRow(row, requestId, index),
  );
  const meta = toReqItemsMeta(validated, requestId, rows.length);

  return {
    rows,
    sourceMeta: {
      primaryOwner: "canonical_issue_items_rpc",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
      contractVersion: meta.contractVersion,
      reason: null,
    },
    meta,
  };
}
