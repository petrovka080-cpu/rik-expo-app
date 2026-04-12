import type { SupabaseClient } from "@supabase/supabase-js";

import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import type { ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import {
  WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
  clearWarehouseRequestSourceTrace,
  readWarehouseRequestSourceTrace,
  recordReqHeadsTrace,
  recordReqItemsTrace,
  reqHeadsPerfNow,
  type ReqHeadsStageMetrics,
  type WarehouseReqHeadsFetchResult,
  type WarehouseReqHeadsSourceMeta,
  type WarehouseReqHeadsWindowMeta,
  type WarehouseReqItemsFetchResult,
} from "./warehouse.requests.read.shared";
import {
  apiFetchReqHeadsCanonicalRaw,
  apiFetchReqItemsCanonicalRaw,
} from "./warehouse.requests.read.canonical";

export type {
  WarehouseReqHeadsFetchResult,
  WarehouseReqHeadsSourceMeta,
  WarehouseReqHeadsWindowMeta,
  WarehouseReqItemsFetchResult,
  WarehouseReqItemsSourceMeta,
} from "./warehouse.requests.read.shared";

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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    recordReqHeadsTrace({
      result: "error",
      sourcePath: "canonical",
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      page,
      pageSize,
      rowCount: null,
      contractVersion: null,
      reason: message,
    });
    recordPlatformObservability({
      screen: "warehouse",
      surface: "req_heads",
      category: "fetch",
      event: "fetch_req_heads_canonical_failed",
      result: "error",
      sourceKind: WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "fetch_req_heads_canonical_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: message,
      extra: {
        page,
        pageSize,
        pageOffset: Math.max(0, page * pageSize),
      },
    });
    throw error;
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

export async function apiFetchReqItemsDetailed(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseReqItemsFetchResult> {
  const requestIdValue = String(requestId ?? "").trim();
  if (!requestIdValue) {
    return {
      rows: [],
      sourceMeta: {
        primaryOwner: "canonical_issue_items_rpc",
        sourcePath: "canonical",
        fallbackUsed: false,
        sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
        contractVersion: "v1",
        reason: null,
      },
      meta: {
        requestId: requestIdValue,
        returnedRowCount: 0,
        scopeKey: `canonical:warehouse_req_items:${requestIdValue}`,
        generatedAt: new Date().toISOString(),
        contractVersion: "v1",
      },
    };
  }

  try {
    const canonical = await apiFetchReqItemsCanonicalRaw(supabase, requestIdValue);
    recordReqItemsTrace({
      result: "success",
      sourcePath: canonical.sourceMeta.sourcePath,
      sourceKind: canonical.sourceMeta.sourceKind,
      requestId: requestIdValue,
      rowCount: canonical.rows.length,
      contractVersion: canonical.sourceMeta.contractVersion,
      reason: canonical.sourceMeta.reason,
    });
    return canonical;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    recordReqItemsTrace({
      result: "error",
      sourcePath: "canonical",
      sourceKind: WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
      requestId: requestIdValue,
      rowCount: null,
      contractVersion: null,
      reason: message,
    });
    throw error;
  }
}

export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  const result = await apiFetchReqItemsDetailed(supabase, requestId);
  return result.rows;
}

export { clearWarehouseRequestSourceTrace, readWarehouseRequestSourceTrace };
