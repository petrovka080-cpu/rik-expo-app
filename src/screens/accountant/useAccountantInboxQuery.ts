/**
 * useAccountantInboxQuery — React Query owner for accountant inbox.
 *
 * P6.2 migration: replaces the manual orchestration in useAccountantInboxController
 * with TanStack Query useInfiniteQuery for paginated inbox data.
 *
 * Removes:
 * - Manual loadSeqRef (stale response guard)
 * - Manual inflightKeyRef (inflight join)
 * - Manual appendInflightKeyRef (append inflight join)
 * - Manual queuedLoadRef (queue-on-overlap)
 * - Manual lastLoadedKeyRef (stale key guard)
 * - Manual cacheByTabRef (tab-scoped cache)
 *
 * Preserves:
 * - Same data fetched via loadAccountantInboxPage
 * - Same page size semantics (ACCOUNTANT_INBOX_PAGE_SIZE)
 * - Automatic cancellation on unmount (query layer)
 * - Automatic dedup (query layer)
 */

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  ACCOUNTANT_INBOX_PAGE_SIZE,
  loadAccountantInboxPage,
  type AccountantInboxWindowLoadResult,
} from "./accountant.repository";
import type { AccountantInboxUiRow, Tab } from "./types";
import { accountantInboxKeys } from "./accountantInbox.query.key";

const INBOX_STALE_TIME = 30_000; // 30s

/** Shape of each page returned by the infinite query */
export type AccountantInboxPageData = AccountantInboxWindowLoadResult;

export function useAccountantInboxQuery(params: {
  tab: Tab;
  enabled: boolean;
}) {
  const { tab, enabled } = params;

  const queryClient = useQueryClient();

  const query = useInfiniteQuery<AccountantInboxPageData>({
    queryKey: accountantInboxKeys.tab(tab),
    queryFn: async ({ pageParam }) => {
      const offsetRows = pageParam as number;
      return loadAccountantInboxPage({
        tab,
        offsetRows,
        limitRows: ACCOUNTANT_INBOX_PAGE_SIZE,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.meta.hasMore) return undefined;
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.rows.length,
        0,
      );
      return totalLoaded;
    },
    staleTime: INBOX_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // ── Flatten pages into a single deduped array ──
  const rows: AccountantInboxUiRow[] = (() => {
    if (!query.data?.pages?.length) return [];
    const seen = new Set<string>();
    const result: AccountantInboxUiRow[] = [];
    for (const page of query.data.pages) {
      for (const row of page.rows) {
        const id = String(row.proposal_id ?? "");
        if (id && !seen.has(id)) {
          seen.add(id);
          result.push(row);
        } else if (!id) {
          result.push(row);
        }
      }
    }
    return result;
  })();

  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const hasMore = lastPage?.meta.hasMore ?? false;
  const totalCount = lastPage?.meta.totalRowCount ?? rows.length;

  return {
    rows,
    hasMore,
    totalCount,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,

    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: accountantInboxKeys.tab(tab),
      }),
  };
}
