import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiFetchReqHeads } from "../warehouse.api";
import type { ReqHeadRow } from "../warehouse.types";

export function useWarehouseReqHeads(params: {
  supabase: SupabaseClient;
  pageSize: number;
}) {
  const { supabase, pageSize } = params;

  const [reqHeads, setReqHeads] = useState<ReqHeadRow[]>([]);
  const [reqHeadsLoading, setReqHeadsLoading] = useState(false);
  const [reqHeadsFetchingPage, setReqHeadsFetchingPage] = useState(false);
  const reqRefs = useRef({ page: 0, hasMore: true, fetching: false });

  const fetchReqHeads = useCallback(
    async (pageIndex: number = 0, forceRefresh: boolean = false) => {
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

