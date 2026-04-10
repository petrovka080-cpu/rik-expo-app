import { useCallback, useEffect, useRef, useState } from "react";

const useMountedRef = () => {
  const ref = useRef(true);
  useEffect(() => () => { ref.current = false; }, []);
  return ref;
};
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  apiFetchReqHeadsWindow,
  type WarehouseReqHeadsFetchResult,
  type WarehouseReqHeadsSourceMeta,
  type WarehouseReqHeadsWindowMeta,
} from "../warehouse.requests.read";
import type {
  ReqHeadRow,
  WarehouseReqHeadsFailureClass,
  WarehouseReqHeadsIntegrityState,
  WarehouseReqHeadsListState,
} from "../warehouse.types";
import {
  classifyWarehouseReqHeadsFailure,
  getWarehouseReqHeadsRetryAfterMs,
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

const pickErrMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const logReqHeadsMetrics = (scope: string, details: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info(`[warehouse.reqHeads] ${scope}`, details);
};

type ReqHeadsSnapshot = {
  rows: ReqHeadRow[];
  pageSize: number;
  hasMore: boolean;
  integrityState: WarehouseReqHeadsIntegrityState;
  listState: WarehouseReqHeadsListState;
};

type ReqHeadsFetchValue = Pick<WarehouseReqHeadsFetchResult, "integrityState"> & {
  rows: ReqHeadRow[];
  hasMore: boolean;
  meta: WarehouseReqHeadsWindowMeta;
  sourceMeta: WarehouseReqHeadsSourceMeta;
};

const cloneReqHeadsRows = (rows: ReqHeadRow[]) => rows.map((row) => ({ ...row }));

const getReqHeadsTrigger = (pageIndex: number, forceRefresh: boolean) =>
  forceRefresh ? "force_refresh" : pageIndex > 0 ? "scroll" : "focus";

const HEALTHY_INTEGRITY_STATE = createHealthyWarehouseReqHeadsIntegrityState();
const HEALTHY_LIST_STATE = deriveWarehouseReqHeadsListState({
  rows: [],
  integrityState: HEALTHY_INTEGRITY_STATE,
});

export function useWarehouseReqHeads(params: {
  supabase: SupabaseClient;
  pageSize: number;
}) {
  const { supabase, pageSize } = params;
  const FORCE_REFRESH_MIN_INTERVAL_MS = 1200;
  const mountedRef = useMountedRef();

  const [reqHeads, setReqHeads] = useState<ReqHeadRow[]>([]);
  const [reqHeadsLoading, setReqHeadsLoading] = useState(false);
  const [reqHeadsFetchingPage, setReqHeadsFetchingPage] = useState(false);
  const [reqHeadsHasMore, setReqHeadsHasMore] = useState(true);
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
  const publishedSnapshotRef = useRef<ReqHeadsSnapshot | null>(null);
  const lastKnownGoodSnapshotRef = useRef<ReqHeadsSnapshot | null>(null);
  const inFlightRef = useRef(new Map<string, Promise<ReqHeadsFetchValue>>());

  const publishReqHeadsPage0 = useCallback(
    (params: {
      rows: ReqHeadRow[];
      hasMore: boolean;
      integrityState: WarehouseReqHeadsIntegrityState;
      trigger: string;
      sourceMeta?: WarehouseReqHeadsSourceMeta;
      meta?: WarehouseReqHeadsWindowMeta;
      event: string;
      result?: "success" | "error" | "cache_hit" | "skipped";
      extra?: Record<string, unknown>;
      stage?: "publish" | "cooldown_skip";
    }) => {
      const rows = cloneReqHeadsRows(params.rows);
      const listState = deriveWarehouseReqHeadsListState({
        rows,
        integrityState: params.integrityState,
      });

      reqRefs.current.page = 0;
      reqRefs.current.hasMore = params.hasMore;
      setReqHeadsHasMore(params.hasMore);
      setReqHeads(rows);
      setReqHeadsIntegrityState(params.integrityState);
      setReqHeadsListState(listState);

      const snapshot: ReqHeadsSnapshot = {
        rows,
        pageSize,
        hasMore: params.hasMore,
        integrityState: params.integrityState,
        listState,
      };
      publishedSnapshotRef.current = snapshot;
      if (params.integrityState.mode === "healthy") {
        lastKnownGoodSnapshotRef.current = snapshot;
      }

      recordWarehouseReqHeadsStateTrace({
        timestamp: new Date().toISOString(),
        stage: params.stage ?? "publish",
        publishState: listState.publishState,
        freshness: listState.freshness,
        failureClass: listState.failureClass,
        rowCount: listState.rowCount,
        lastKnownGoodUsed: listState.lastKnownGoodUsed,
        cooldownActive: listState.cooldownActive,
        cooldownReason: listState.cooldownReason,
        reason: listState.reason,
        message: listState.message,
        trigger: params.trigger,
      });

      recordPlatformObservability({
        screen: "warehouse",
        surface: "req_heads_list",
        category: "ui",
        event: params.event,
        result:
          params.result ??
          (listState.publishState === "error"
            ? "error"
            : listState.publishState === "ready" || listState.publishState === "empty"
              ? "success"
              : "cache_hit"),
        trigger: params.trigger,
        rowCount: rows.length,
        sourceKind: params.sourceMeta?.sourceKind,
        fallbackUsed:
          params.sourceMeta?.fallbackUsed ??
          (listState.publishState === "degraded" || listState.publishState === "error"),
        errorStage: listState.reason ?? undefined,
        errorClass: listState.failureClass ?? undefined,
        errorMessage: listState.message ?? undefined,
        extra: {
          publishState: listState.publishState,
          freshness: listState.freshness,
          lastKnownGoodUsed: listState.lastKnownGoodUsed,
          cooldownActive: listState.cooldownActive,
          cooldownReason: listState.cooldownReason,
          pageSize,
          hasMore: params.hasMore,
          integrityMode: params.integrityState.mode,
          pageOffset: params.meta?.pageOffset ?? 0,
          scopeKey: params.meta?.scopeKey ?? null,
          primaryOwner: params.sourceMeta?.primaryOwner ?? null,
          contractVersion: params.meta?.contractVersion ?? null,
          totalRowCount: params.meta?.totalRowCount ?? null,
          ...params.extra,
        },
      });

      return listState;
    },
    [pageSize],
  );

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      const now = Date.now();
      const trigger = getReqHeadsTrigger(pageIndex, forceRefresh);
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
              console.warn("[warehouse.reqHeads] fetch throttled by failure cooldown", {
                failureClass: reqRefs.current.lastFailureClass,
                remainingMs: cooldownDecision.remainingMs,
              });
            }
          }

          const published = publishedSnapshotRef.current;
          const throttledIntegrity = createWarehouseReqHeadsIntegrityState({
            mode: published?.integrityState.mode === "healthy" ? "error" : published?.integrityState.mode ?? "error",
            failureClass: reqRefs.current.lastFailureClass ?? published?.integrityState.failureClass ?? "server_failure",
            reason: published?.integrityState.reason ?? "fetch_req_heads_throttled",
            message: published?.integrityState.message ?? null,
            cacheUsed:
              published?.integrityState.cacheUsed === true ||
              published?.listState.lastKnownGoodUsed === true,
            freshness: published?.integrityState.freshness,
            cooldownActive: true,
            cooldownReason: cooldownDecision.cooldownReason,
          });
          publishReqHeadsPage0({
            rows: published?.rows ?? [],
            hasMore: published?.hasMore ?? false,
            integrityState: throttledIntegrity,
            trigger,
            event: "content_throttled",
            result: "skipped",
            extra: {
              pageIndex,
              forceRefresh,
              failureClass: reqRefs.current.lastFailureClass,
              retryAfterMs: cooldownDecision.retryAfterMs,
              remainingMs: cooldownDecision.remainingMs,
            },
            stage: "cooldown_skip",
          });
          return;
        }
      }

      if (reqRefs.current.fetching) {
        recordPlatformObservability({
          screen: "warehouse",
          surface: "req_heads",
          category: "reload",
          event: "fetch_req_heads",
          result: "joined_inflight",
          trigger,
          extra: { pageIndex, forceRefresh },
        });
        return;
      }
      if (pageIndex > 0 && !reqRefs.current.hasMore && !forceRefresh) {
        recordPlatformGuardSkip("no_more_pages", {
          screen: "warehouse",
          surface: "req_heads",
          event: "fetch_req_heads",
          trigger,
          extra: { pageIndex, forceRefresh },
        });
        return;
      }
      if (pageIndex === 0 && !forceRefresh) {
        const cached = publishedSnapshotRef.current;
        if (cached && cached.pageSize === pageSize && cached.integrityState.mode === "healthy") {
          publishReqHeadsPage0({
            rows: cached.rows,
            hasMore: cached.hasMore,
            integrityState: cached.integrityState,
            trigger,
            event: "content_cache_hit",
            result: "cache_hit",
            extra: { pageIndex, forceRefresh },
          });
          return;
        }
      }

      reqRefs.current.fetching = true;
      if (mountedRef.current) setReqHeadsFetchingPage(true);
      if (pageIndex === 0 && mountedRef.current) setReqHeadsLoading(true);

      try {
        const requestKey = `${pageIndex}:${forceRefresh ? 1 : 0}:${pageSize}`;
        let request = inFlightRef.current.get(requestKey);
        if (!request) {
          request = apiFetchReqHeadsWindow(supabase, pageIndex, pageSize).then((result) => {
            logReqHeadsMetrics("window_fetch", {
              pageIndex,
              pageSize,
              forceRefresh,
              rowCount: result.rows.length,
              totalRowCount: result.meta.totalRowCount,
              hasMore: result.meta.hasMore,
              primaryOwner: result.sourceMeta.primaryOwner,
              sourceKind: result.sourceMeta.sourceKind,
              contractVersion: result.meta.contractVersion,
              scopeKey: result.meta.scopeKey,
              pageOffset: result.meta.pageOffset,
              repairedMissingIdsCount: result.meta.repairedMissingIdsCount,
            });
            return {
              rows: result.rows,
              hasMore: result.meta.hasMore,
              meta: result.meta,
              sourceMeta: result.sourceMeta,
              integrityState: result.integrityState,
            };
          });
          inFlightRef.current.set(requestKey, request);
        }
        const next = await request;
        const rows = next.rows;

        const hasNext = next.hasMore;
        reqRefs.current.hasMore = hasNext;
        reqRefs.current.page = pageIndex;
        setReqHeadsHasMore(hasNext);
        if (pageIndex === 0) {
          const publishDecision = resolveWarehouseReqHeadsPrimaryPublish({
            rows,
            hasMore: hasNext,
            integrityState: next.integrityState,
            sourcePath: next.sourceMeta.sourcePath,
            sourceReason: next.sourceMeta.reason,
            lastKnownGood:
              lastKnownGoodSnapshotRef.current && lastKnownGoodSnapshotRef.current.pageSize === pageSize
                ? {
                    rows: lastKnownGoodSnapshotRef.current.rows,
                    hasMore: lastKnownGoodSnapshotRef.current.hasMore,
                  }
                : null,
          });

          if (publishDecision.integrityState.mode === "healthy") {
            reqRefs.current.lastFailureAt = 0;
            reqRefs.current.lastFailureClass = null;
            reqRefs.current.lastFailureRetryAfterMs = 0;
          } else {
            const failureClass = publishDecision.integrityState.failureClass ?? "server_failure";
            reqRefs.current.lastFailureAt = Date.now();
            reqRefs.current.lastFailureClass = failureClass;
            reqRefs.current.lastFailureRetryAfterMs = getWarehouseReqHeadsRetryAfterMs(failureClass);
          }
          publishReqHeadsPage0({
            rows: publishDecision.rows,
            hasMore: publishDecision.hasMore,
            integrityState: publishDecision.integrityState,
            trigger,
            sourceMeta: next.sourceMeta,
            meta: next.meta,
            event:
              publishDecision.listState.publishState === "error" ? "content_error" : "content_ready",
            result: publishDecision.listState.publishState === "error" ? "error" : undefined,
            extra: {
              stage: "primary",
              pageIndex,
              forceRefresh,
              repairedMissingIdsCount: next.meta.repairedMissingIdsCount,
              falseEmptyPrevented: publishDecision.falseEmptyPrevented,
            },
          });
        } else {
          let appendedRowCount = 0;
          let duplicateRowCount = 0;
          setReqHeads((prev) => {
            const exist = new Set(prev.map((r) => r.request_id));
            const toAdd = rows.filter((r) => !exist.has(r.request_id));
            appendedRowCount = toAdd.length;
            duplicateRowCount = rows.length - toAdd.length;
            return [...prev, ...toAdd];
          });
          recordPlatformObservability({
            screen: "warehouse",
            surface: "req_heads_list",
            category: "ui",
            event: "append_merge",
            result: "success",
            trigger,
            rowCount: appendedRowCount,
            sourceKind: next.sourceMeta.sourceKind,
            fallbackUsed: next.sourceMeta.fallbackUsed,
            extra: {
              pageIndex,
              pageOffset: next.meta.pageOffset,
              scopeKey: next.meta.scopeKey,
              primaryOwner: next.sourceMeta.primaryOwner,
              contractVersion: next.meta.contractVersion,
              totalRowCount: next.meta.totalRowCount,
              duplicateRowCount,
              integrityMode: next.integrityState.mode,
              publishState: publishedSnapshotRef.current?.listState.publishState ?? null,
            },
          });
        }
      } catch (e) {
        const failure = classifyWarehouseReqHeadsFailure(e);
        if (pageIndex === 0) {
          reqRefs.current.lastFailureAt = Date.now();
          reqRefs.current.lastFailureClass = failure.failureClass;
          reqRefs.current.lastFailureRetryAfterMs = failure.retryAfterMs;
          const lastKnownGood = lastKnownGoodSnapshotRef.current;
          if (lastKnownGood && lastKnownGood.pageSize === pageSize) {
            const integrityState = createWarehouseReqHeadsIntegrityState({
              mode: "stale_last_known_good",
              failureClass: failure.failureClass,
              reason: "fetch_req_heads_failed",
              message: pickErrMessage(e),
              cacheUsed: true,
            });
            publishReqHeadsPage0({
              rows: lastKnownGood.rows,
              hasMore: lastKnownGood.hasMore,
              integrityState,
              trigger,
              event: "content_ready_stale_cache",
              result: "cache_hit",
              extra: {
                pageIndex,
                forceRefresh,
                cachedHasMore: lastKnownGood.hasMore,
                retryAfterMs: failure.retryAfterMs,
              },
            });
          } else {
            publishReqHeadsPage0({
              rows: [],
              hasMore: false,
              integrityState: createWarehouseReqHeadsIntegrityState({
                mode: "error",
                failureClass: failure.failureClass,
                reason: "fetch_req_heads_failed",
                message: pickErrMessage(e),
                cacheUsed: false,
              }),
              trigger,
              event: "content_error",
              result: "error",
              extra: {
                pageIndex,
                forceRefresh,
                retryAfterMs: failure.retryAfterMs,
              },
            });
          }
        } else {
          reqRefs.current.hasMore = false;
          setReqHeadsHasMore(false);
        }
        if (__DEV__) {
          console.warn("[warehouse.reqHeads] fetch failed", {
            pageIndex,
            forceRefresh,
            failureClass: failure.failureClass,
            error: pickErrMessage(e),
          });
        }
        throw e;
      } finally {
        const requestKey = `${pageIndex}:${forceRefresh ? 1 : 0}:${pageSize}`;
        inFlightRef.current.delete(requestKey);
        reqRefs.current.fetching = false;
        if (mountedRef.current) {
          setReqHeadsFetchingPage(false);
          if (pageIndex === 0) setReqHeadsLoading(false);
        }
      }
    },
    [publishReqHeadsPage0, supabase, pageSize],
  );

  return {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqHeadsHasMore,
    reqHeadsIntegrityState,
    reqHeadsListState,
    reqRefs,
    fetchReqHeads,
  };
}
