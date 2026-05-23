/**
 * useBuyerInboxQuery — React Query owner for buyer inbox.
 *
 * P6.3 migration: replaces the manual orchestration in
 * useBuyerLoadingController's inbox window loading with
 * TanStack Query useInfiniteQuery.
 *
 * Removes:
 * - Manual inboxLoadInFlightRef (inflight join)
 * - Manual queuedInboxResetRef (queue-on-overlap)
 * - Manual inboxLoadedGroupsRef (pagination state)
 * - Manual inboxTotalGroupsRef (pagination state)
 * - Manual inboxHasMoreRef (pagination state)
 *
 * Preserves:
 * - Same data fetched via loadBuyerInboxWindowData
 * - Same group page size semantics (BUYER_INBOX_GROUP_PAGE_SIZE)
 * - Automatic cancellation on unmount (query layer)
 * - Automatic dedup (query layer)
 */

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  loadBuyerInboxWindowData,
  type BuyerInboxLoadResult,
} from "./buyer.fetchers";
import { buyerInboxKeys } from "./buyerInbox.query.key";

const BUYER_INBOX_GROUP_PAGE_SIZE = 12;
const BUYER_INBOX_STALE_TIME = 30_000;

export type BuyerInboxPageData = BuyerInboxLoadResult;

export function useBuyerInboxQuery(params: {
  supabase: SupabaseClient;
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  searchQuery: string;
  enabled: boolean;
  log?: (msg: unknown, ...rest: unknown[]) => void;
}) {
  const { supabase, listBuyerInbox, searchQuery, enabled, log } = params;
  const searchKey = String(searchQuery ?? "").trim();

  const queryClient = useQueryClient();
  const queryKey = useMemo(() => buyerInboxKeys.search(searchKey), [searchKey]);

  const query = useInfiniteQuery<BuyerInboxPageData>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const offsetGroups = pageParam as number;
      return loadBuyerInboxWindowData({
        supabase,
        listBuyerInbox,
        offsetGroups,
        limitGroups: BUYER_INBOX_GROUP_PAGE_SIZE,
        search: searchKey || null,
        log,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta.hasMore) return undefined;
      return lastPage.meta.offsetGroups + lastPage.meta.returnedGroupCount;
    },
    staleTime: BUYER_INBOX_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const {
    data,
    error,
    fetchNextPage: fetchNextPageQuery,
    isError,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch: refetchQuery,
  } = query;

  // ── Flatten pages into a single deduped array ──
  const rows: BuyerInboxRow[] = useMemo(() => {
    if (!data?.pages?.length) return [];
    const seen = new Set<string>();
    const result: BuyerInboxRow[] = [];
    for (const page of data.pages) {
      for (const row of page.rows) {
        const key = String(row.request_item_id ?? "").trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          result.push(row);
        } else if (!key) {
          result.push(row);
        }
      }
    }
    return result;
  }, [data?.pages]);

  // ── Collect all requestIds across all pages ──
  const requestIds: string[] = useMemo(() => {
    if (!data?.pages?.length) return [];
    const seen = new Set<string>();
    for (const page of data.pages) {
      for (const id of page.requestIds) {
        seen.add(id);
      }
    }
    return Array.from(seen);
  }, [data?.pages]);

  const lastPage = data?.pages?.[data.pages.length - 1];
  const hasMore = lastPage?.meta.hasMore ?? false;
  const totalGroupCount = lastPage?.meta.totalGroupCount ?? 0;
  const lastPageMeta = lastPage?.meta ?? null;
  const lastPageSourceMeta = lastPage?.sourceMeta ?? null;

  const fetchNextPage = useCallback(() => fetchNextPageQuery({ cancelRefetch: false }), [fetchNextPageQuery]);
  const refetch = useCallback(() => refetchQuery({ cancelRefetch: false }), [refetchQuery]);
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false }),
    [queryClient, queryKey],
  );

  return useMemo(
    () => ({
      rows,
      requestIds,
      hasMore,
      totalGroupCount,
      lastPageMeta,
      lastPageSourceMeta,

      isLoading,
      isFetching,
      isFetchingNextPage,
      isError,
      error,

      fetchNextPage,
      refetch,
      invalidate,
    }),
    [
      error,
      fetchNextPage,
      hasMore,
      invalidate,
      isError,
      isFetching,
      isFetchingNextPage,
      isLoading,
      lastPageMeta,
      lastPageSourceMeta,
      refetch,
      requestIds,
      rows,
      totalGroupCount,
    ],
  );
}
