import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiFetchReqHeads } from "../warehouse.api";
import type { ReqHeadRow } from "../warehouse.types";

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

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
      const now = Date.now();
      if (pageIndex === 0 && forceRefresh) {
        if (now - reqRefs.current.lastForceStartAt < FORCE_REFRESH_MIN_INTERVAL_MS) return;
        if (reqRefs.current.lastErrorAt > 0 && now - reqRefs.current.lastErrorAt < FORCE_REFRESH_ERROR_COOLDOWN_MS) {
          if (now - reqRefs.current.lastForceSkipLogAt > 2000) {
            reqRefs.current.lastForceSkipLogAt = now;
            console.warn("[warehouse.reqHeads] force refresh skipped by error cooldown");
          }
          return;
        }
        reqRefs.current.lastForceStartAt = now;
      }

      if (reqRefs.current.fetching) return;
      if (pageIndex > 0 && !reqRefs.current.hasMore && !forceRefresh) return;

      reqRefs.current.fetching = true;
      setReqHeadsFetchingPage(true);
      if (pageIndex === 0) setReqHeadsLoading(true);

      try {
        const rows = await apiFetchReqHeads(supabase, pageIndex, pageSize);

        // apiFetchReqHeads applies status/view filtering, so page can be shorter than pageSize
        // even when more rows exist in later ranges. Stop only when backend returns zero rows.
        const hasNext = rows.length > 0;
        reqRefs.current.hasMore = hasNext;
        reqRefs.current.page = pageIndex;

        if (pageIndex === 0) {
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
        if (pageIndex === 0) setReqHeads([]);
        console.warn("[warehouse.reqHeads] fetch failed", {
          pageIndex,
          forceRefresh,
          error: (e as { message?: string } | null)?.message ?? String(e),
        });
        throw e;
      } finally {
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
