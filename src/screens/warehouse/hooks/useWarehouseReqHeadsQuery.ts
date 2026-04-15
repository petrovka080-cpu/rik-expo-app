/**
 * useWarehouseReqHeadsQuery — React Query owner for warehouse request heads.
 *
 * P6.1b migration: replaces the manual inflight join, dedup,
 * abort controller, and pagination tracking in useWarehouseReqHeads
 * with TanStack Query useInfiniteQuery.
 *
 * Removes:
 * - Manual reqRefs.fetching (inflight guard)
 * - Manual requestRef (AbortController slot)
 * - Manual reqRefs.page / hasMore (pagination state)
 * - Manual dedup (joined_inflight observability)
 * - Manual setReqHeadsLoading / setReqHeadsFetchingPage
 *
 * Preserves:
 * - Same data fetched via apiFetchReqHeadsWindow
 * - Same page size semantics
 * - Abort on unmount (query layer)
 * - Same return shape: rows, hasMore, meta, sourceMeta, integrityState
 *
 * NOT included (kept in adapter):
 * - Failure classification + cooldown evaluation
 * - Integrity/list state derivation
 * - Force refresh cooldown (1200ms)
 * - Network offline guard (kept for observability)
 * - publishReqHeadsPage0 observability
 */

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  apiFetchReqHeadsWindow,
  type WarehouseReqHeadsFetchResult,
} from "../warehouse.requests.read";
import type { ReqHeadRow } from "../warehouse.types";
import { warehouseReqHeadsKeys } from "./warehouseReqHeads.query.key";

const REQ_HEADS_STALE_TIME = 30_000; // 30s

/** Shape of each page returned by the infinite query */
export type WarehouseReqHeadsPageData = WarehouseReqHeadsFetchResult;

export function useWarehouseReqHeadsQuery(params: {
  supabase: SupabaseClient;
  pageSize: number;
  enabled: boolean;
}) {
  const { supabase, pageSize, enabled } = params;

  const queryClient = useQueryClient();

  const query = useInfiniteQuery<WarehouseReqHeadsPageData>({
    queryKey: warehouseReqHeadsKeys.page(pageSize),
    queryFn: async ({ pageParam, signal }) => {
      const page = pageParam as number;
      return apiFetchReqHeadsWindow(supabase, page, pageSize, { signal });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.meta.hasMore) return undefined;
      return allPages.length; // page index = number of fetched pages
    },
    staleTime: REQ_HEADS_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
    // Disable React Query's built-in retry — the adapter hook manages
    // its own cooldown/backoff via the existing failure state machine.
    retry: false,
  });

  // ── Flatten pages into a single deduped array ──
  const rows: ReqHeadRow[] = (() => {
    if (!query.data?.pages?.length) return [];
    const seen = new Set<string>();
    const result: ReqHeadRow[] = [];
    for (const page of query.data.pages) {
      for (const row of page.rows) {
        const id = String(row.request_id);
        if (!seen.has(id)) {
          seen.add(id);
          result.push(row);
        }
      }
    }
    return result;
  })();

  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const firstPage = query.data?.pages?.[0];

  return {
    /** Flattened, deduped rows across all pages */
    rows,

    /** Page 0 metadata (primary integrity/source) */
    firstPageIntegrityState: firstPage?.integrityState ?? null,
    firstPageSourceMeta: firstPage?.sourceMeta ?? null,
    firstPageMeta: firstPage?.meta ?? null,

    /** Last page metadata (pagination) */
    hasMore: query.hasNextPage ?? false,
    lastPageMeta: lastPage?.meta ?? null,

    /** Query state */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,

    /** Actions */
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: warehouseReqHeadsKeys.page(pageSize),
      }),
  };
}
