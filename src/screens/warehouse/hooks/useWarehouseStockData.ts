import { useCallback, useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiEnrichStockNamesFromRikRu } from "../warehouse.stock.read";
import { scheduleWarehouseNameMapRefresh } from "../warehouse.nameMap.ui";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";
import { useWarehouseStockQuery } from "./useWarehouseStockQuery";

const NAME_MAP_ENQUEUE_TTL_MS = 60_000;

/**
 * useWarehouseStockData — public API boundary for warehouse stock.
 *
 * P6.1 migration: fetch ownership is now delegated to
 * useWarehouseStockQuery (React Query useInfiniteQuery). This hook preserves
 * the exact same return contract for all consumers.
 *
 * Removed:
 * - Manual stockFetchSeqRef (dedup counter) — replaced by query dedup
 * - Manual stockFetchInFlightRef (inflight join) — replaced by query dedup
 * - Manual queuedResetRef / queuedAppendRef (queued refresh) — replaced by query invalidation
 * - Manual loadedCountRef / totalCountRef / hasMoreRef — replaced by useInfiniteQuery
 * - Manual searchInitializedRef — replaced by query key change
 * - Manual mergeStockRows — replaced by query page flattening with dedup
 * - Manual runFetch — replaced by queryFn
 *
 * Preserved:
 * - Same return shape: { stock, stockSupported, stockCount, stockHasMore, stockLoadingMore, fetchStock, fetchStockNextPage }
 * - Same consumer contract
 * - Late name enrichment pipeline (stock-specific, not query-level)
 * - Name map refresh TTL cache (unrelated to query layer)
 * - Screen activity guard (via enabled param)
 */
export function useWarehouseStockData(params: {
  supabase: SupabaseClient;
  search?: string;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, search } = params;
  const searchKey = String(search ?? "").trim();
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const enqueuedCodeAtRef = useRef<Record<string, number>>({});

  const query = useWarehouseStockQuery({
    supabase,
    search: searchKey,
    enabled: isWarehouseScreenActive(screenActiveRef),
  });

  // ── Name map refresh TTL cache (kept from original) ──
  const selectCodesToRefresh = useCallback((codes: string[]): string[] => {
    const now = Date.now();
    const cache = enqueuedCodeAtRef.current;
    const next: string[] = [];

    for (const code of codes) {
      const key = String(code || "")
        .trim()
        .toUpperCase();
      if (!key) continue;
      const lastAt = cache[key] ?? 0;
      if (now - lastAt < NAME_MAP_ENQUEUE_TTL_MS) continue;
      cache[key] = now;
      next.push(key);
    }

    for (const [key, value] of Object.entries(cache)) {
      if (now - value > NAME_MAP_ENQUEUE_TTL_MS * 3) {
        delete cache[key];
      }
    }

    return next;
  }, []);

  // ── Late enrichment: post-query effect ──
  const enrichmentMeta = query.enrichmentMeta;
  const enrichmentAppliedRef = useRef<string>("");

  useEffect(() => {
    if (!enrichmentMeta) return;
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    if ((enrichmentMeta.rikDeferredCodes?.length ?? 0) <= 0) return;

    // Dedupe: only run once per enrichment signature
    const signature = (enrichmentMeta.rikDeferredCodes ?? []).sort().join("|");
    if (signature === enrichmentAppliedRef.current) return;
    enrichmentAppliedRef.current = signature;

    // Schedule name map refresh for missing codes
    const missingCodes = selectCodesToRefresh(
      enrichmentMeta.missingProjectionCodes ?? [],
    );
    if (missingCodes.length > 0) {
      void scheduleWarehouseNameMapRefresh({
        supabase,
        codeList: missingCodes,
        refreshMode: "incremental",
      }).catch((error) => {
        if (__DEV__) {
          console.warn(
            "[fetchStock] enqueue name-map refresh error",
            error,
          );
        }
      });
    }

    // Late rik enrichment — updates stock rows in-place via query invalidation
    void apiEnrichStockNamesFromRikRu(supabase, query.stock, {
      rikDeferredCodes: enrichmentMeta.rikDeferredCodes,
      overrideCodes: enrichmentMeta.overrideCodes,
    })
      .then((enrichedRows) => {
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        if (enrichedRows.length === 0) return;
        recordPlatformObservability({
          screen: "warehouse",
          surface: "stock_list",
          category: "ui",
          event: "content_ready",
          result: "success",
          rowCount: enrichedRows.length,
          extra: { stage: "late_name_enrichment" },
        });
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn("[fetchStock] late rik enrichment error", error);
        }
      });
  }, [enrichmentMeta, screenActiveRef, selectCodesToRefresh, supabase, query.stock]);

  // ── Imperative API (backward compat) ──
  const fetchStock = useCallback(
    async (options?: {
      reset?: boolean;
      reason?:
        | "initial"
        | "refresh"
        | "append"
        | "search"
        | "issue"
        | "receive";
    }) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const reset = options?.reset ?? true;

      if (reset) {
        query.invalidate();
      } else {
        if (query.stockHasMore) {
          await query.fetchNextPage();
        }
      }
    },
    [screenActiveRef, query],
  );

  const fetchStockNextPage = useCallback(async () => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    if (query.stockHasMore) {
      await query.fetchNextPage();
    }
  }, [screenActiveRef, query]);

  return {
    stock: query.stock,
    stockSupported: query.stockSupported,
    stockCount: query.stockCount,
    stockHasMore: query.stockHasMore,
    stockLoadingMore: query.stockLoadingMore,
    fetchStock,
    fetchStockNextPage,
  };
}
