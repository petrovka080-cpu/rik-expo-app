import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  abortController,
  isAbortError,
  throwIfAborted,
} from "../../../lib/requestCancellation";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const pickErrMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim())
    return error.message.trim();
  return String(error ?? "");
};

const logReqHeadsMetrics = (
  scope: string,
  details: Record<string, unknown>,
) => {
  if (!__DEV__) return;
  console.info(`[warehouse.reqHeads] ${scope}`, details);
};

type ReqHeadsFetchValue = Pick<
  WarehouseReqHeadsFetchResult,
  "integrityState"
> & {
  rows: ReqHeadRow[];
  hasMore: boolean;
  meta: WarehouseReqHeadsWindowMeta;
  sourceMeta: WarehouseReqHeadsSourceMeta;
};

type ReqHeadsRequestSlot = {
  key: string;
  controller: AbortController;
};

const cloneReqHeadsRows = (rows: ReqHeadRow[]) =>
  rows.map((row) => ({ ...row }));

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
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, pageSize } = params;
  const FORCE_REFRESH_MIN_INTERVAL_MS = 1200;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

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
  const requestRef = useRef<ReqHeadsRequestSlot | null>(null);

  const abortReqHeadsRequest = useCallback((reason: string) => {
    abortController(requestRef.current?.controller, reason);
  }, []);

  useEffect(() => () => {
    abortReqHeadsRequest("warehouse request heads unmounted");
  }, [abortReqHeadsRequest]);

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

      if (!isWarehouseScreenActive(screenActiveRef)) {
        return listState;
      }

      reqRefs.current.page = 0;
      reqRefs.current.hasMore = params.hasMore;
      setReqHeadsHasMore(params.hasMore);
      setReqHeads(rows);
      setReqHeadsIntegrityState(params.integrityState);
      setReqHeadsListState(listState);

      recordWarehouseReqHeadsStateTrace({
        timestamp: new Date().toISOString(),
        stage: params.stage ?? "publish",
        publishState: listState.publishState,
        freshness: listState.freshness,
        failureClass: listState.failureClass,
        rowCount: listState.rowCount,
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
            : listState.publishState === "ready" ||
                listState.publishState === "empty"
              ? "success"
              : "cache_hit"),
        trigger: params.trigger,
        rowCount: rows.length,
        sourceKind: params.sourceMeta?.sourceKind,
        fallbackUsed:
          params.sourceMeta?.fallbackUsed ??
          listState.publishState === "error",
        errorStage: listState.reason ?? undefined,
        errorClass: listState.failureClass ?? undefined,
        errorMessage: listState.message ?? undefined,
        extra: {
          publishState: listState.publishState,
          freshness: listState.freshness,
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
    [pageSize, screenActiveRef],
  );

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
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
          publishReqHeadsPage0({
            rows: [],
            hasMore: false,
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
      reqRefs.current.fetching = true;
      if (isWarehouseScreenActive(screenActiveRef))
        setReqHeadsFetchingPage(true);
      if (pageIndex === 0 && isWarehouseScreenActive(screenActiveRef))
        setReqHeadsLoading(true);
      const requestKey = `${pageIndex}:${forceRefresh ? 1 : 0}:${pageSize}`;
      abortReqHeadsRequest("warehouse request heads superseded");
      const requestSlot: ReqHeadsRequestSlot = {
        key: requestKey,
        controller: new AbortController(),
      };
      requestRef.current = requestSlot;
      const { signal } = requestSlot.controller;

      try {
        throwIfAborted(signal);
        const result = await apiFetchReqHeadsWindow(supabase, pageIndex, pageSize, {
          signal,
        });
        throwIfAborted(signal);
        if (requestRef.current !== requestSlot) return;
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
        const next: ReqHeadsFetchValue = {
          rows: result.rows,
          hasMore: result.meta.hasMore,
          meta: result.meta,
          sourceMeta: result.sourceMeta,
          integrityState: result.integrityState,
        };
        if (!isWarehouseScreenActive(screenActiveRef)) return;
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
          });

          if (publishDecision.integrityState.mode === "healthy") {
            reqRefs.current.lastFailureAt = 0;
            reqRefs.current.lastFailureClass = null;
            reqRefs.current.lastFailureRetryAfterMs = 0;
          } else {
            const failureClass =
              publishDecision.integrityState.failureClass ?? "server_failure";
            reqRefs.current.lastFailureAt = Date.now();
            reqRefs.current.lastFailureClass = failureClass;
            reqRefs.current.lastFailureRetryAfterMs =
              getWarehouseReqHeadsRetryAfterMs(failureClass);
          }
          publishReqHeadsPage0({
            rows: publishDecision.rows,
            hasMore: publishDecision.hasMore,
            integrityState: publishDecision.integrityState,
            trigger,
            sourceMeta: next.sourceMeta,
            meta: next.meta,
            event:
              publishDecision.listState.publishState === "error"
                ? "content_error"
                : "content_ready",
            result:
              publishDecision.listState.publishState === "error"
                ? "error"
                : undefined,
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
          if (!isWarehouseScreenActive(screenActiveRef)) return;
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
              publishState: null,
            },
          });
        }
      } catch (e) {
        if (isAbortError(e) || requestRef.current !== requestSlot) return;
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        const failure = classifyWarehouseReqHeadsFailure(e);
        if (pageIndex === 0) {
          reqRefs.current.lastFailureAt = Date.now();
          reqRefs.current.lastFailureClass = failure.failureClass;
          reqRefs.current.lastFailureRetryAfterMs = failure.retryAfterMs;
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
        if (requestRef.current === requestSlot) {
          requestRef.current = null;
        }
        reqRefs.current.fetching = false;
        if (isWarehouseScreenActive(screenActiveRef)) {
          setReqHeadsFetchingPage(false);
          if (pageIndex === 0) setReqHeadsLoading(false);
        }
      }
    },
    [abortReqHeadsRequest, publishReqHeadsPage0, screenActiveRef, supabase, pageSize],
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
