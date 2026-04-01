import type { SupabaseClient } from "@supabase/supabase-js";

import { loadCanonicalRequestsByIds } from "../../lib/api/requestCanonical.read";
import { isRequestVisibleInWarehouseIssueQueue } from "../../lib/requestStatus";
import { applyWarehouseReqHeadTruth, toWarehouseTextOrNull, type UnknownRow } from "./warehouse.adapters";
import { classifyWarehouseReqHeadsFailure } from "./warehouse.reqHeads.failure";
import {
  compareWarehouseReqHeads as compareWarehouseReqHeadsRepair,
  repairWarehouseReqHeadsPage0,
} from "./warehouse.reqHeads.repair";
import {
  createHealthyWarehouseReqHeadsIntegrityState,
  createWarehouseReqHeadsIntegrityState,
} from "./warehouse.reqHeads.state";
import { parseNum } from "./warehouse.request.utils";
import type { ReqHeadRow } from "./warehouse.types";
import {
  WAREHOUSE_REQ_HEADS_LEGACY_SOURCE_KIND,
  enrichReqHeadsMetaCounted,
  loadWarehouseReqHeadTruthByRequestIds,
  logWarehouseRequestReadFallback,
  normalizeUuidList,
  reqHeadsPerfNow,
  toReqHeadsScopeKey,
  type ReqHeadsConvergedResult,
  type WarehouseReqHeadsLegacyFetchResult,
} from "./warehouse.requests.read.shared";

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

export async function loadReqHeadsConverged(
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

export async function apiFetchReqHeadsDegradedRaw(
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
