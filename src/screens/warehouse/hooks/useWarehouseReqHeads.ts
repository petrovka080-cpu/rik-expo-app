import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiFetchReqHeads, apiFetchReqHeadsStaged } from "../warehouse.api";
import type { ReqHeadRow } from "../warehouse.types";

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
  const reqRefs = useRef({
    page: 0,
    hasMore: true,
    fetching: false,
    lastErrorAt: 0,
    lastForceStartAt: 0,
    lastForceSkipLogAt: 0,
  });
  const cacheRef = useRef<ReqHeadsSnapshot | null>(null);
  const inFlightRef = useRef(new Map<string, Promise<ReqHeadRow[]>>());

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      const now = Date.now();
      if (pageIndex === 0 && forceRefresh) {
        if (now - reqRefs.current.lastForceStartAt < FORCE_REFRESH_MIN_INTERVAL_MS) return;
        if (reqRefs.current.lastErrorAt > 0 && now - reqRefs.current.lastErrorAt < FORCE_REFRESH_ERROR_COOLDOWN_MS) {
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

      if (reqRefs.current.fetching) return;
      if (pageIndex > 0 && !reqRefs.current.hasMore && !forceRefresh) return;
      if (pageIndex === 0 && !forceRefresh) {
        const cached = cacheRef.current;
        if (cached && cached.pageSize === pageSize) {
          reqRefs.current.page = 0;
          reqRefs.current.hasMore = cached.rows.length > 0;
          setReqHeads(cached.rows);
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
          if (pageIndex === 0 && !forceRefresh) {
            request = (async () => {
              const staged = await apiFetchReqHeadsStaged(supabase, pageIndex, pageSize);
              setReqHeads(staged.baseRows);
              logReqHeadsMetrics("stage_a", {
                pageIndex,
                pageSize,
                forceRefresh,
                stageA_ms: staged.metrics.stage_a_ms,
                base_rows_count: staged.baseRows.length,
              });
              const finalResult = await staged.finalRowsPromise;
              logReqHeadsMetrics("stage_b", {
                pageIndex,
                pageSize,
                forceRefresh,
                stageA_ms: finalResult.metrics.stage_a_ms,
                stageB_ms: finalResult.metrics.stage_b_ms,
                fallback_missing_ids_count: finalResult.metrics.fallback_missing_ids_count,
                enriched_rows_count: finalResult.metrics.enriched_rows_count,
                page0_required_repair: finalResult.metrics.page0_required_repair,
                final_rows_count: finalResult.rows.length,
              });
              return finalResult.rows;
            })();
          } else {
            request = apiFetchReqHeads(supabase, pageIndex, pageSize);
          }
          inFlightRef.current.set(requestKey, request);
        }
        const rows = await request;

        // apiFetchReqHeads applies status/view filtering, so page can be shorter than pageSize
        // even when more rows exist in later ranges. Stop only when backend returns zero rows.
        const hasNext = rows.length > 0;
        reqRefs.current.hasMore = hasNext;
        reqRefs.current.page = pageIndex;

        if (pageIndex === 0) {
          cacheRef.current = { rows, pageSize };
          setReqHeads(rows);
        } else {
          setReqHeads((prev) => {
            const exist = new Set(prev.map((r) => r.request_id));
            const toAdd = rows.filter((r) => !exist.has(r.request_id));
            return [...prev, ...toAdd];
          });
        }
      } catch (e) {
        reqRefs.current.hasMore = false;
        reqRefs.current.lastErrorAt = Date.now();
        if (pageIndex === 0) {
          cacheRef.current = null;
          setReqHeads([]);
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
    reqRefs,
    fetchReqHeads,
  };
}
