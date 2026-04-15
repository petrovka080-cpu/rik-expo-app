/**
 * useWarehouseStockQuery — React Query owner for warehouse stock data.
 *
 * P6.1 migration: replaces the manual orchestration in useWarehouseStockData
 * with TanStack Query useInfiniteQuery for paginated stock data.
 *
 * Removes:
 * - Manual stockFetchSeqRef (dedup counter)
 * - Manual stockFetchInFlightRef (inflight join)
 * - Manual queuedResetRef / queuedAppendRef (queued refresh)
 * - Manual loadedCountRef / totalCountRef / hasMoreRef (pagination state)
 * - Manual searchInitializedRef (search debounce guard)
 *
 * Preserves:
 * - Same data shape: StockRow[]
 * - Same pagination semantics: offset-based with page size 120
 * - Network-offline guard (observability)
 * - Automatic cancellation on unmount (query layer)
 * - Automatic dedup (query layer)
 */

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  apiFetchStock,
  type WarehouseStockFetchResult,
} from "../warehouse.stock.read";
import type { StockRow } from "../warehouse.types";

/** Query key factory for warehouse stock */
export const warehouseStockKeys = {
  all: ["warehouse", "stock"] as const,
  search: (search: string) => ["warehouse", "stock", search] as const,
} as const;

const STOCK_PAGE_SIZE = 120;
const STOCK_STALE_TIME = 30_000; // 30s — stock changes more frequently than reports

/** Shape of each page returned by the infinite query */
export type WarehouseStockPageData = WarehouseStockFetchResult;

/**
 * React Query infinite query hook for warehouse stock.
 *
 * Replaces:
 * - Manual stockFetchSeqRef + stockFetchInFlightRef (dedup)
 * - Manual queuedResetRef / queuedAppendRef (queued page load)
 * - Manual loadedCountRef / totalCountRef / hasMoreRef (pagination)
 * - Manual search debounce initial guard
 *
 * Preserves:
 * - Same staleTime semantics
 * - Automatic cancellation on unmount
 * - Automatic dedup
 * - Same data shape
 */
export function useWarehouseStockQuery(params: {
  supabase: SupabaseClient;
  search: string;
  enabled: boolean;
}) {
  const { supabase, search, enabled } = params;
  const searchKey = String(search ?? "").trim();

  const queryClient = useQueryClient();

  const query = useInfiniteQuery<WarehouseStockPageData>({
    queryKey: warehouseStockKeys.search(searchKey),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      return apiFetchStock(supabase, offset, STOCK_PAGE_SIZE);
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
    staleTime: STOCK_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
  });

  // ── Flatten pages into a single array with dedup ──
  const stock: StockRow[] = (() => {
    if (!query.data?.pages?.length) return [];
    const byId = new Map<string, StockRow>();
    for (const page of query.data.pages) {
      for (const row of page.rows) {
        const key = String(
          row.material_id || `${row.code || ""}:${row.uom_id || ""}`,
        );
        byId.set(key, row);
      }
    }
    return Array.from(byId.values());
  })();

  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const stockSupported = lastPage?.supported ?? null;
  const stockCount = lastPage?.meta.totalRowCount ?? stock.length;
  const stockHasMore = query.hasNextPage ?? false;
  const stockLoadingMore = query.isFetchingNextPage;

  // ── Enrichment metadata from all pages ──
  const enrichmentMeta = (() => {
    if (!query.data?.pages?.length) return null;
    const allRikDeferred: string[] = [];
    const allOverrideCodes: string[] = [];
    const allMissingProjectionCodes: string[] = [];
    for (const page of query.data.pages) {
      if (page.rikDeferredCodes) allRikDeferred.push(...page.rikDeferredCodes);
      if (page.overrideCodes) allOverrideCodes.push(...page.overrideCodes);
      if (page.missingProjectionCodes)
        allMissingProjectionCodes.push(...page.missingProjectionCodes);
    }
    return {
      rikDeferredCodes: allRikDeferred,
      overrideCodes: allOverrideCodes,
      missingProjectionCodes: allMissingProjectionCodes,
    };
  })();

  return {
    /** Flattened, deduped stock rows across all pages */
    stock,
    stockSupported,
    stockCount,
    stockHasMore,
    stockLoadingMore,

    /** Enrichment metadata for late name enrichment */
    enrichmentMeta,

    /** Query metadata */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    /** Fetch next page — replaces manual fetchStockNextPage */
    fetchNextPage: query.fetchNextPage,

    /** Refetch — replaces manual fetchStock(reset: true) */
    refetch: query.refetch,

    /** Imperative invalidation — forces fresh fetch */
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: warehouseStockKeys.search(searchKey),
      }),
  };
}
