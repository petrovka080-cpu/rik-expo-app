import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadCanonicalRequestItemsByRequestId,
  loadCanonicalRequestsByIds,
  loadCanonicalRequestsWindow,
} from "../../lib/api/requestCanonical.read";
import { isRequestVisibleInWarehouseIssueQueue } from "../../lib/requestStatus";
import { asUnknownRows } from "./warehouse.api.repo";
import {
  applyWarehouseReqHeadTruth,
  compareWarehouseReqHeads,
  mapWarehouseCanonicalRequestToReqHeadRow,
} from "./warehouse.adapters";
import { createHealthyWarehouseReqHeadsIntegrityState } from "./warehouse.reqHeads.state";
import type { ReqHeadRow } from "./warehouse.types";
import {
  WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_CANONICAL_MATERIALIZED_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_DIRECT_DEGRADED_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND,
  adaptReqHeadsRpcRow,
  enrichReqHeadsMetaCounted,
  loadWarehouseReqHeadTruthByRequestIds,
  mapWarehouseReqItemsFromView,
  materializeCanonicalRequestItems,
  toReqHeadsRpcMeta,
  toReqHeadsScopeKey,
  toReqItemsScopeKey,
  type WarehouseReqHeadsFetchResult,
  type WarehouseReqItemsFetchResult,
} from "./warehouse.requests.read.shared";

const createFallbackReqHead = (
  requestId: string,
  overrides: Partial<ReqHeadRow> = {},
): ReqHeadRow =>
  ({
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
    ...overrides,
  }) as ReqHeadRow;

export async function apiFetchReqHeadsCompatibilityRaw(
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

export async function apiFetchReqHeadsCanonicalRaw(
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

export async function apiFetchReqItemsCanonicalRaw(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseReqItemsFetchResult> {
  const [headLookup, canonicalItems] = await Promise.all([
    loadCanonicalRequestsByIds(supabase, [requestId], { includeItemCounts: true }),
    loadCanonicalRequestItemsByRequestId(supabase, requestId),
  ]);
  const head = headLookup.rows.length ? mapWarehouseCanonicalRequestToReqHeadRow(headLookup.rows[0]) : null;
  const canonicalItemsById = new Map(canonicalItems.map((item) => [item.id, item]));
  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .eq("request_id", requestId)
    .order("name_human", { ascending: true });

  if (q.error) throw q.error;

  if (Array.isArray(q.data) && q.data.length) {
    const rows = mapWarehouseReqItemsFromView(
      asUnknownRows(q.data),
      canonicalItemsById,
      head ?? createFallbackReqHead(requestId),
    );
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
        requestId,
        returnedRowCount: rows.length,
        scopeKey: toReqItemsScopeKey(requestId, "canonical"),
        generatedAt: headLookup.meta.generatedAt,
        contractVersion: headLookup.meta.contractVersion,
      },
    };
  }

  const materializedRows = await materializeCanonicalRequestItems(
    supabase,
    head ??
      createFallbackReqHead(requestId, {
        items_cnt: canonicalItems.length,
        ready_cnt: canonicalItems.length,
        qty_limit_sum: canonicalItems.reduce((sum, item) => sum + item.qty, 0),
        qty_left_sum: canonicalItems.reduce((sum, item) => sum + item.qty, 0),
      }),
    canonicalItems,
  );
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
      requestId,
      returnedRowCount: materializedRows.length,
      scopeKey: toReqItemsScopeKey(requestId, "canonical"),
      generatedAt: headLookup.meta.generatedAt,
      contractVersion: "request_items_materialized_v1",
    },
  };
}

export async function apiFetchReqItemsCompatibilityRaw(
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
    : createFallbackReqHead(requestId);

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

export async function apiFetchReqItemsDegradedDirectRaw(
  supabase: SupabaseClient,
  requestId: string,
  reason: string | null,
): Promise<WarehouseReqItemsFetchResult> {
  const headLookup = await loadCanonicalRequestsByIds(supabase, [requestId], {
    includeItemCounts: true,
  });
  const head = headLookup.rows.length
    ? mapWarehouseCanonicalRequestToReqHeadRow(headLookup.rows[0])
    : createFallbackReqHead(requestId);

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
