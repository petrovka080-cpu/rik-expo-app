import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WarehouseReqHeadsFailureClass,
  WarehouseReqHeadsIntegrityState,
  WarehouseReqHeadsListState,
} from "../warehouse.types";
import {
  classifyWarehouseReqHeadsFailure,
} from "../warehouse.reqHeads.failure";
import {
  createHealthyWarehouseReqHeadsIntegrityState,
  createWarehouseReqHeadsIntegrityState,
  deriveWarehouseReqHeadsListState,
  evaluateWarehouseReqHeadsCooldown,
  recordWarehouseReqHeadsStateTrace,
  resolveWarehouseReqHeadsPrimaryPublish,
} from "../warehouse.reqHeads.state";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";
import { useWarehouseReqHeadsQuery } from "./useWarehouseReqHeadsQuery";

/**
 * useWarehouseReqHeads — public API boundary for warehouse request heads.
 *
 * P6.1b migration: fetch ownership is now delegated to
 * useWarehouseReqHeadsQuery (React Query useInfiniteQuery). This hook preserves
 * the exact same return contract for all consumers.
 *
 * Removed:
 * - Manual requestRef (AbortController slot) — replaced by query cancellation
 * - Manual reqRefs.fetching — replaced by query isFetching
 * - Manual dedup (joined_inflight) — replaced by query dedup
 * - Manual pagination merge (setReqHeads prev => [...prev, ...toAdd]) — replaced by query page flatten
 *
 * Preserved:
 * - Same return shape: { reqHeads, reqHeadsLoading, reqHeadsFetchingPage, reqHeadsHasMore, reqHeadsIntegrityState, reqHeadsListState, reqRefs, fetchReqHeads }
 * - Failure classification + cooldown (exact same state machine)
 * - Network offline guard (exact same observability)
 * - Force refresh cooldown (1200ms)
 * - publishReqHeadsPage0 observability
 * - All integrity/list state derivation
 */

const HEALTHY_INTEGRITY_STATE = createHealthyWarehouseReqHeadsIntegrityState();
const HEALTHY_LIST_STATE = deriveWarehouseReqHeadsListState({
  rows: [],
  integrityState: HEALTHY_INTEGRITY_STATE,
});

export function useWarehouseReqHeads(params: {
  supabase: SupabaseClient;
  pageSize: number;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, pageSize } = params;
  const FORCE_REFRESH_MIN_INTERVAL_MS = 1200;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  // ── Query hook owns fetch, pagination, dedup, abort ──
  const query = useWarehouseReqHeadsQuery({
    supabase,
    pageSize,
    enabled: isWarehouseScreenActive(screenActiveRef),
  });

  // ── State that the query cannot own (failure machine) ──
  const [reqHeadsIntegrityState, setReqHeadsIntegrityState] =
    useState<WarehouseReqHeadsIntegrityState>(HEALTHY_INTEGRITY_STATE);
  const [reqHeadsListState, setReqHeadsListState] =
    useState<WarehouseReqHeadsListState>(HEALTHY_LIST_STATE);

  const reqRefs = useRef({
    page: 0,
    hasMore: true,
    fetching: false,
    lastFailureAt: 0,
    lastFailureClass: null as WarehouseReqHeadsFailureClass | null,
    lastFailureRetryAfterMs: 0,
    lastForceStartAt: 0,
    lastForceSkipLogAt: 0,
  });

  // ── Sync query state → reqRefs (backward compat for ExpenseQueueSlice) ──
  useEffect(() => {
    reqRefs.current.fetching = query.isFetching;
    reqRefs.current.hasMore = query.hasMore;
    const pageCount = (query as unknown as { data?: { pages?: unknown[] } }).data?.pages?.length ?? 0;
    reqRefs.current.page = Math.max(0, pageCount - 1);
  }, [query.isFetching, query.hasMore, query]);

  // ── Sync query success → integrity/list state ──
  useEffect(() => {
    if (query.isLoading || query.isFetching) return;
    if (query.isError) return; // handled below
    if (!query.firstPageIntegrityState) return;
    if (!isWarehouseScreenActive(screenActiveRef)) return;

    const integrityState = query.firstPageIntegrityState;
    const rows = query.rows;

    const publishDecision = resolveWarehouseReqHeadsPrimaryPublish({
      rows,
      hasMore: query.hasMore,
      integrityState,
    });

    if (publishDecision.integrityState.mode === "healthy") {
      reqRefs.current.lastFailureAt = 0;
      reqRefs.current.lastFailureClass = null;
      reqRefs.current.lastFailureRetryAfterMs = 0;
    }

    setReqHeadsIntegrityState(publishDecision.integrityState);
    setReqHeadsListState(publishDecision.listState);

    recordWarehouseReqHeadsStateTrace({
      timestamp: new Date().toISOString(),
      stage: "publish",
      publishState: publishDecision.listState.publishState,
      freshness: publishDecision.listState.freshness,
      failureClass: publishDecision.listState.failureClass,
      rowCount: publishDecision.listState.rowCount,
      cooldownActive: publishDecision.listState.cooldownActive,
      cooldownReason: publishDecision.listState.cooldownReason,
      reason: publishDecision.listState.reason,
      message: publishDecision.listState.message,
      trigger: "query_sync",
    });

    recordPlatformObservability({
      screen: "warehouse",
      surface: "req_heads_list",
      category: "ui",
      event:
        publishDecision.listState.publishState === "error"
          ? "content_error"
          : "content_ready",
      result:
        publishDecision.listState.publishState === "error"
          ? "error"
          : "success",
      trigger: "query_sync",
      rowCount: rows.length,
      sourceKind: query.firstPageSourceMeta?.sourceKind,
      fallbackUsed: query.firstPageSourceMeta?.fallbackUsed ?? false,
      extra: {
        publishState: publishDecision.listState.publishState,
        freshness: publishDecision.listState.freshness,
        hasMore: query.hasMore,
        integrityMode: integrityState.mode,
        pageSize,
        primaryOwner: query.firstPageSourceMeta?.primaryOwner ?? null,
      },
    });
  }, [query.isLoading, query.isFetching, query.isError, query.firstPageIntegrityState, query.firstPageSourceMeta, query.rows, query.hasMore, screenActiveRef, pageSize]);

  // ── Sync query error → failure classification + cooldown ──
  useEffect(() => {
    if (!query.isError || !query.error) return;
    if (!isWarehouseScreenActive(screenActiveRef)) return;

    const failure = classifyWarehouseReqHeadsFailure(query.error);
    reqRefs.current.lastFailureAt = Date.now();
    reqRefs.current.lastFailureClass = failure.failureClass;
    reqRefs.current.lastFailureRetryAfterMs = failure.retryAfterMs;

    const errorIntegrity = createWarehouseReqHeadsIntegrityState({
      mode: "error",
      failureClass: failure.failureClass,
      reason: "fetch_req_heads_failed",
      message: query.error instanceof Error ? query.error.message.trim() : String(query.error),
      cacheUsed: false,
    });
    const errorListState = deriveWarehouseReqHeadsListState({
      rows: [],
      integrityState: errorIntegrity,
    });

    setReqHeadsIntegrityState(errorIntegrity);
    setReqHeadsListState(errorListState);

    recordWarehouseReqHeadsStateTrace({
      timestamp: new Date().toISOString(),
      stage: "publish",
      publishState: "error",
      freshness: "stale",
      failureClass: failure.failureClass,
      rowCount: 0,
      cooldownActive: false,
      cooldownReason: null,
      reason: "fetch_req_heads_failed",
      message: errorIntegrity.message,
      trigger: "query_error",
    });

    recordPlatformObservability({
      screen: "warehouse",
      surface: "req_heads_list",
      category: "ui",
      event: "content_error",
      result: "error",
      trigger: "query_error",
      rowCount: 0,
      errorStage: "fetch_req_heads_failed",
      errorClass: failure.failureClass,
      errorMessage: errorIntegrity.message ?? undefined,
      extra: {
        pageSize,
        retryAfterMs: failure.retryAfterMs,
      },
    });

    if (__DEV__) {
      console.warn("[warehouse.reqHeads] fetch failed", {
        failureClass: failure.failureClass,
        error: errorIntegrity.message,
      });
    }
  }, [query.isError, query.error, screenActiveRef, pageSize]);

  // ── Imperative fetchReqHeads (backward compat) ──
  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const now = Date.now();
      const trigger = forceRefresh
        ? "force_refresh"
        : pageIndex > 0
          ? "scroll"
          : "focus";

      // ── Network offline guard ──
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "warehouse",
          surface: "req_heads",
          event: "fetch_req_heads",
          trigger,
          extra: { pageIndex, forceRefresh, networkKnownOffline: true },
        });
        return;
      }

      // ── Force refresh cooldown ──
      if (pageIndex === 0 && forceRefresh) {
        if (
          isPlatformGuardCoolingDown({
            lastAt: reqRefs.current.lastForceStartAt,
            minIntervalMs: FORCE_REFRESH_MIN_INTERVAL_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_same_scope", {
            screen: "warehouse",
            surface: "req_heads",
            event: "fetch_req_heads",
            trigger,
            extra: { pageIndex, forceRefresh },
          });
          return;
        }
        reqRefs.current.lastForceStartAt = now;
      }

      // ── Failure cooldown ──
      if (pageIndex === 0) {
        const cooldownDecision = evaluateWarehouseReqHeadsCooldown({
          lastFailureAt: reqRefs.current.lastFailureAt,
          retryAfterMs: reqRefs.current.lastFailureRetryAfterMs,
          now,
        });
        if (cooldownDecision.active) {
          recordPlatformGuardSkip("recent_error", {
            screen: "warehouse",
            surface: "req_heads",
            event: "fetch_req_heads",
            trigger,
            extra: {
              pageIndex,
              forceRefresh,
              failureClass: reqRefs.current.lastFailureClass,
              retryAfterMs: cooldownDecision.retryAfterMs,
              remainingMs: cooldownDecision.remainingMs,
            },
          });
          if (now - reqRefs.current.lastForceSkipLogAt > 2000) {
            reqRefs.current.lastForceSkipLogAt = now;
            if (__DEV__) {
              console.warn(
                "[warehouse.reqHeads] fetch throttled by failure cooldown",
                {
                  failureClass: reqRefs.current.lastFailureClass,
                  remainingMs: cooldownDecision.remainingMs,
                },
              );
            }
          }

          const throttledIntegrity = createWarehouseReqHeadsIntegrityState({
            mode: "error",
            failureClass:
              reqRefs.current.lastFailureClass ?? "server_failure",
            reason: "fetch_req_heads_throttled",
            message: null,
            cacheUsed: false,
            cooldownActive: true,
            cooldownReason: cooldownDecision.cooldownReason,
          });
          const throttledListState = deriveWarehouseReqHeadsListState({
            rows: [],
            integrityState: throttledIntegrity,
          });

          setReqHeadsIntegrityState(throttledIntegrity);
          setReqHeadsListState(throttledListState);

          recordWarehouseReqHeadsStateTrace({
            timestamp: new Date().toISOString(),
            stage: "cooldown_skip",
            publishState: throttledListState.publishState,
            freshness: throttledListState.freshness,
            failureClass: throttledListState.failureClass,
            rowCount: 0,
            cooldownActive: true,
            cooldownReason: cooldownDecision.cooldownReason,
            reason: throttledListState.reason,
            message: throttledListState.message,
            trigger,
          });

          recordPlatformObservability({
            screen: "warehouse",
            surface: "req_heads_list",
            category: "ui",
            event: "content_throttled",
            result: "skipped",
            trigger,
            rowCount: 0,
            extra: {
              pageIndex,
              forceRefresh,
              failureClass: reqRefs.current.lastFailureClass,
              retryAfterMs: cooldownDecision.retryAfterMs,
              remainingMs: cooldownDecision.remainingMs,
            },
          });
          return;
        }
      }

      // ── Delegate to query ──
      if (pageIndex === 0) {
        // Page 0 = invalidate (forces re-fetch of all pages from scratch)
        query.invalidate();
      } else {
        // Append page
        if (query.hasMore) {
          await query.fetchNextPage();
        }
      }
    },
    [screenActiveRef, query],
  );

  return {
    reqHeads: query.rows,
    reqHeadsLoading: query.isLoading,
    reqHeadsFetchingPage: query.isFetchingNextPage,
    reqHeadsHasMore: query.hasMore,
    reqHeadsIntegrityState,
    reqHeadsListState,
    reqRefs,
    fetchReqHeads,
  };
}
