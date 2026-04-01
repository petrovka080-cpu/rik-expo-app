import type { SupabaseClient } from "@supabase/supabase-js";

import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import type { ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import {
  WAREHOUSE_REQ_HEADS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_HEADS_RPC_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_CANONICAL_SOURCE_KIND,
  WAREHOUSE_REQ_ITEMS_VIEW_SOURCE_KIND,
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
  type WarehouseReqItemsSourceMeta,
} from "./warehouse.requests.read.shared";
import {
  apiFetchReqHeadsCanonicalRaw,
  apiFetchReqHeadsCompatibilityRaw,
  apiFetchReqItemsCanonicalRaw,
  apiFetchReqItemsCompatibilityRaw,
  apiFetchReqItemsDegradedDirectRaw,
} from "./warehouse.requests.read.canonical";
import { apiFetchReqHeadsDegradedRaw } from "./warehouse.requests.read.repair";

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
        scopeKey: `canonical:warehouse_req_items:${requestIdValue}`,
        generatedAt: new Date().toISOString(),
        contractVersion: "request_lookup_v2",
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

export { clearWarehouseRequestSourceTrace, readWarehouseRequestSourceTrace };
