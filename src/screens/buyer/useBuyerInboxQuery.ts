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
  const queryKey = buyerInboxKeys.search(searchKey);

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

  // ── Flatten pages into a single deduped array ──
  const rows: BuyerInboxRow[] = (() => {
    if (!query.data?.pages?.length) return [];
    const seen = new Set<string>();
    const result: BuyerInboxRow[] = [];
    for (const page of query.data.pages) {
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
  })();

  // ── Collect all requestIds across all pages ──
  const requestIds: string[] = (() => {
    if (!query.data?.pages?.length) return [];
    const seen = new Set<string>();
    for (const page of query.data.pages) {
      for (const id of page.requestIds) {
        seen.add(id);
      }
    }
    return Array.from(seen);
  })();

  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const hasMore = lastPage?.meta.hasMore ?? false;
  const totalGroupCount = lastPage?.meta.totalGroupCount ?? 0;
  const lastPageMeta = lastPage?.meta ?? null;
  const lastPageSourceMeta = lastPage?.sourceMeta ?? null;

  return {
    rows,
    requestIds,
    hasMore,
    totalGroupCount,
    lastPageMeta,
    lastPageSourceMeta,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,

    fetchNextPage: () => query.fetchNextPage({ cancelRefetch: false }),
    refetch: () => query.refetch({ cancelRefetch: false }),
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false }),
  };
}
