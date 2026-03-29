import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  apiFetchReqHeadsWindow,
  type WarehouseReqHeadsFetchResult,
  type WarehouseReqHeadsSourceMeta,
  type WarehouseReqHeadsWindowMeta,
} from "../warehouse.requests.read";
import type { ReqHeadRow, WarehouseReqHeadsIntegrityState } from "../warehouse.types";
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
};

type ReqHeadsFetchValue = Pick<WarehouseReqHeadsFetchResult, "integrityState"> & {
  rows: ReqHeadRow[];
  hasMore: boolean;
  meta: WarehouseReqHeadsWindowMeta;
  sourceMeta: WarehouseReqHeadsSourceMeta;
};

const HEALTHY_INTEGRITY_STATE: WarehouseReqHeadsIntegrityState = {
  mode: "healthy",
  reason: null,
  message: null,
  cacheUsed: false,
};

export function useWarehouseReqHeads(params: {
  supabase: SupabaseClient;
  pageSize: number;
}) {
  const { supabase, pageSize } = params;
  const FORCE_REFRESH_MIN_INTERVAL_MS = 1200;
  const FORCE_REFRESH_ERROR_COOLDOWN_MS = 5000;

  const [reqHeads, setReqHeads] = useState<ReqHeadRow[]>([]);
  const [reqHeadsLoading, setReqHeadsLoading] = useState(false);
  const [reqHeadsFetchingPage, setReqHeadsFetchingPage] = useState(false);
  const [reqHeadsHasMore, setReqHeadsHasMore] = useState(true);
  const [reqHeadsIntegrityState, setReqHeadsIntegrityState] =
    useState<WarehouseReqHeadsIntegrityState>(HEALTHY_INTEGRITY_STATE);
  const reqRefs = useRef({
    page: 0,
    hasMore: true,
    fetching: false,
    lastErrorAt: 0,
    lastForceStartAt: 0,
    lastForceSkipLogAt: 0,
  });
  const cacheRef = useRef<ReqHeadsSnapshot | null>(null);
  const inFlightRef = useRef(new Map<string, Promise<ReqHeadsFetchValue>>());

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      const now = Date.now();
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "warehouse",
          surface: "req_heads",
          event: "fetch_req_heads",
          trigger: forceRefresh ? "force_refresh" : pageIndex > 0 ? "scroll" : "focus",
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
            trigger: "force_refresh",
            extra: { pageIndex, forceRefresh },
          });
          return;
        }
        if (
          reqRefs.current.lastErrorAt > 0 &&
          isPlatformGuardCoolingDown({
            lastAt: reqRefs.current.lastErrorAt,
            minIntervalMs: FORCE_REFRESH_ERROR_COOLDOWN_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_error", {
            screen: "warehouse",
            surface: "req_heads",
            event: "fetch_req_heads",
            trigger: "force_refresh",
            extra: { pageIndex, forceRefresh },
          });
          if (now - reqRefs.current.lastForceSkipLogAt > 2000) {
            reqRefs.current.lastForceSkipLogAt = now;
            if (__DEV__) {
              console.warn("[warehouse.reqHeads] force refresh skipped by error cooldown");
            }
          }
          return;
        }
        reqRefs.current.lastForceStartAt = now;
      }

      if (reqRefs.current.fetching) {
        recordPlatformObservability({
          screen: "warehouse",
          surface: "req_heads",
          category: "reload",
          event: "fetch_req_heads",
          result: "joined_inflight",
          extra: { pageIndex, forceRefresh },
        });
        return;
      }
      if (pageIndex > 0 && !reqRefs.current.hasMore && !forceRefresh) {
        recordPlatformGuardSkip("no_more_pages", {
          screen: "warehouse",
          surface: "req_heads",
          event: "fetch_req_heads",
          trigger: "scroll",
          extra: { pageIndex, forceRefresh },
        });
        return;
      }
      if (pageIndex === 0 && !forceRefresh) {
        const cached = cacheRef.current;
        if (cached && cached.pageSize === pageSize) {
          reqRefs.current.page = 0;
          reqRefs.current.hasMore = cached.hasMore;
          setReqHeadsHasMore(reqRefs.current.hasMore);
          setReqHeads(cached.rows);
          setReqHeadsIntegrityState(cached.integrityState);
          return;
        }
      }

      reqRefs.current.fetching = true;
      setReqHeadsFetchingPage(true);
      if (pageIndex === 0) setReqHeadsLoading(true);

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
        setReqHeadsIntegrityState(next.integrityState);

        if (pageIndex === 0) {
          cacheRef.current = {
            rows,
            pageSize,
            hasMore: hasNext,
            integrityState: next.integrityState,
          };
          setReqHeads(rows);
          recordPlatformObservability({
            screen: "warehouse",
            surface: "req_heads_list",
            category: "ui",
            event: "content_ready",
            result: "success",
            rowCount: rows.length,
            sourceKind: next.sourceMeta.sourceKind,
            fallbackUsed: next.sourceMeta.fallbackUsed,
            extra: {
              stage: "primary",
              pageIndex,
              pageOffset: next.meta.pageOffset,
              scopeKey: next.meta.scopeKey,
              primaryOwner: next.sourceMeta.primaryOwner,
              contractVersion: next.meta.contractVersion,
              totalRowCount: next.meta.totalRowCount,
              integrityMode: next.integrityState.mode,
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
            },
          });
        }
      } catch (e) {
        reqRefs.current.lastErrorAt = Date.now();
        if (pageIndex === 0) {
          const cached = cacheRef.current;
          if (cached && cached.pageSize === pageSize) {
            reqRefs.current.page = 0;
            reqRefs.current.hasMore = cached.hasMore;
            setReqHeadsHasMore(cached.hasMore);
            setReqHeads(cached.rows);
            setReqHeadsIntegrityState({
              mode: "stale_last_known_good",
              reason: "fetch_req_heads_failed",
              message: pickErrMessage(e),
              cacheUsed: true,
            });
            recordPlatformObservability({
              screen: "warehouse",
              surface: "req_heads_list",
              category: "ui",
              event: "content_ready_stale_cache",
              result: "success",
              rowCount: cached.rows.length,
              fallbackUsed: true,
              extra: {
                pageIndex,
                forceRefresh,
                cachedHasMore: cached.hasMore,
                reason: "fetch_req_heads_failed",
              },
            });
          } else {
            reqRefs.current.hasMore = false;
            setReqHeadsHasMore(false);
            cacheRef.current = null;
            setReqHeads([]);
            setReqHeadsIntegrityState({
              mode: "error",
              reason: "fetch_req_heads_failed",
              message: pickErrMessage(e),
              cacheUsed: false,
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
            error: pickErrMessage(e),
          });
        }
        throw e;
      } finally {
        const requestKey = `${pageIndex}:${forceRefresh ? 1 : 0}:${pageSize}`;
        inFlightRef.current.delete(requestKey);
        reqRefs.current.fetching = false;
        setReqHeadsFetchingPage(false);
        if (pageIndex === 0) setReqHeadsLoading(false);
      }
    },
    [supabase, pageSize],
  );

  return {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqHeadsHasMore,
    reqHeadsIntegrityState,
    reqRefs,
    fetchReqHeads,
  };
}
