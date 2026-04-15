/**
 * useAccountantHistoryQuery — React Query owner for accountant history.
 *
 * P6.2 migration: replaces the manual orchestration in useAccountantHistoryController
 * with TanStack Query useInfiniteQuery for paginated history data.
 *
 * Removes:
 * - Manual historySeqRef (stale response guard)
 * - Manual historyInflightKeyRef (inflight join)
 * - Manual historyAppendInflightKeyRef (append inflight join)
 * - Manual historyQueuedRef (queue-on-overlap)
 * - Manual lastLoadedHistKeyRef (stale key guard)
 * - Manual historySnapshotRef (snapshot cache)
 *
 * Preserves:
 * - Same data fetched via loadAccountantHistoryPage
 * - Same page size semantics (ACCOUNTANT_HISTORY_PAGE_SIZE)
 * - Automatic cancellation on unmount (query layer)
 * - Automatic dedup (query layer)
 */

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  ACCOUNTANT_HISTORY_PAGE_SIZE,
  loadAccountantHistoryPage,
  type AccountantHistoryWindowLoadResult,
} from "./accountant.repository";
import type { HistoryRow } from "./types";
import { accountantHistoryKeys } from "./accountantHistory.query.key";

const HISTORY_STALE_TIME = 30_000; // 30s

/** Shape of each page returned by the infinite query */
export type AccountantHistoryPageData = AccountantHistoryWindowLoadResult;

export function useAccountantHistoryQuery(params: {
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (value: string) => string | null;
  enabled: boolean;
}) {
  const { dateFrom, dateTo, histSearch, toRpcDateOrNull, enabled } = params;

  const queryClient = useQueryClient();

  const query = useInfiniteQuery<AccountantHistoryPageData>({
    queryKey: accountantHistoryKeys.filters(dateFrom, dateTo, histSearch),
    queryFn: async ({ pageParam }) => {
      const offsetRows = pageParam as number;
      return loadAccountantHistoryPage({
        dateFrom,
        dateTo,
        histSearch,
        offsetRows,
        limitRows: ACCOUNTANT_HISTORY_PAGE_SIZE,
        toRpcDateOrNull,
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
    staleTime: HISTORY_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // ── Flatten pages into a single array ──
  const rows: HistoryRow[] = (() => {
    if (!query.data?.pages?.length) return [];
    const result: HistoryRow[] = [];
    for (const page of query.data.pages) {
      for (const row of page.rows) {
        result.push(row);
      }
    }
    return result;
  })();

  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const hasMore = lastPage?.meta.hasMore ?? false;
  const totalCount = lastPage?.meta.totalRowCount ?? rows.length;
  const totalAmount = lastPage?.meta.totalAmount ?? 0;
  const currency = rows[0]?.invoice_currency ?? "KGS";

  return {
    rows,
    hasMore,
    totalCount,
    totalAmount,
    currency,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,

    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: accountantHistoryKeys.filters(dateFrom, dateTo, histSearch),
      }),
  };
}
