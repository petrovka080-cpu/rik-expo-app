import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiEnrichStockNamesFromRikRu, apiFetchStock } from "../warehouse.stock.read";
import { scheduleWarehouseNameMapRefresh } from "../warehouse.nameMap.ui";
import type { StockRow } from "../warehouse.types";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";
import { useWarehouseUnmountSafety } from "./useWarehouseUnmountSafety";

const NAME_MAP_ENQUEUE_TTL_MS = 60_000;
const STOCK_PAGE_SIZE = 120;
const STOCK_SEARCH_COMPAT_LIMIT = 2000;

const buildStockRowKey = (row: StockRow) =>
  String(row.material_id || `${row.code || ""}:${row.uom_id || ""}`);

const mergeStockRows = (previous: StockRow[], incoming: StockRow[]): StockRow[] => {
  const byId = new Map(previous.map((row) => [buildStockRowKey(row), row] as const));
  for (const row of incoming) {
    byId.set(buildStockRowKey(row), row);
  }
  return Array.from(byId.values());
};

export function useWarehouseStockData(params: {
  supabase: SupabaseClient;
  search?: string;
}) {
  const { supabase, search } = params;
  const searchKey = String(search ?? "").trim();
  const unmountSafety = useWarehouseUnmountSafety("warehouse_stock_data");

  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);
  const [stockCount, setStockCount] = useState(0);
  const [stockHasMore, setStockHasMore] = useState(false);
  const [stockLoadingMore, setStockLoadingMore] = useState(false);

  const stockFetchSeqRef = useRef(0);
  const stockFetchInFlightRef = useRef<Promise<void> | null>(null);
  const queuedResetRef = useRef(false);
  const queuedAppendRef = useRef(false);
  const fetchStockRef = useRef<((options?: {
    reset?: boolean;
    reason?: "initial" | "refresh" | "append" | "search" | "issue" | "receive";
  }) => Promise<void>) | null>(null);
  const fetchStockNextPageRef = useRef<(() => Promise<void>) | null>(null);
  const loadedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const hasMoreRef = useRef(false);
  const enqueuedCodeAtRef = useRef<Record<string, number>>({});
  const searchInitializedRef = useRef(false);

  const selectCodesToRefresh = useCallback((codes: string[]): string[] => {
    const now = Date.now();
    const cache = enqueuedCodeAtRef.current;
    const next: string[] = [];

    for (const code of codes) {
      const key = String(code || "").trim().toUpperCase();
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

  const applyLateEnrichment = useCallback((
    rows: StockRow[],
    options: { append: boolean; fetchSeq: number; rikDeferredCodes?: string[]; overrideCodes?: string[] },
  ) => {
    if ((options.rikDeferredCodes?.length ?? 0) <= 0) return;

    void apiEnrichStockNamesFromRikRu(supabase, rows, {
      rikDeferredCodes: options.rikDeferredCodes,
      overrideCodes: options.overrideCodes,
    })
      .then((enrichedRows) => {
        if (
          stockFetchSeqRef.current !== options.fetchSeq ||
          !unmountSafety.shouldHandleAsyncResult({
            resource: "late_stock_name_enrichment",
            reason: options.append ? "append" : "reset",
          })
        ) {
          return;
        }
        unmountSafety.guardStateUpdate(
          () => {
            setStock((previous) =>
              options.append ? mergeStockRows(previous, enrichedRows) : enrichedRows,
            );
          },
          {
            resource: "late_stock_name_publish",
            reason: options.append ? "append" : "reset",
          },
        );
        recordPlatformObservability({
          screen: "warehouse",
          surface: "stock_list",
          category: "ui",
          event: "content_ready",
          result: "success",
          rowCount: enrichedRows.length,
          extra: { stage: "late_name_enrichment", append: options.append },
        });
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn("[fetchStock] late rik enrichment error", error);
        }
      });
  }, [supabase, unmountSafety]);

  const runFetch = useCallback(async (options: {
    reset: boolean;
    reason: "initial" | "refresh" | "append" | "search" | "issue" | "receive";
  }) => {
    const searchCompat = searchKey.length > 0;
    const offset = options.reset || searchCompat ? 0 : loadedCountRef.current;
    const limit = searchCompat ? STOCK_SEARCH_COMPAT_LIMIT : STOCK_PAGE_SIZE;
    const append = !options.reset && !searchCompat;

    if (options.reset) {
      unmountSafety.guardStateUpdate(
        () => {
          setStockLoadingMore(false);
        },
        {
          resource: "stock_loading_more_reset",
          reason: options.reason,
        },
      );
    } else {
      unmountSafety.guardStateUpdate(
        () => {
          setStockLoadingMore(true);
        },
        {
          resource: "stock_loading_more_start",
          reason: options.reason,
        },
      );
    }

    const fetchSeq = stockFetchSeqRef.current + 1;
    stockFetchSeqRef.current = fetchSeq;

    try {
      const result = await apiFetchStock(supabase, offset, limit);
      if (
        !unmountSafety.shouldHandleAsyncResult({
          resource: "fetch_stock_result",
          reason: options.reason,
        })
      ) {
        return;
      }
      const nextRows = result.rows || [];

      unmountSafety.guardStateUpdate(
        () => {
          setStock((previous) => (append ? mergeStockRows(previous, nextRows) : nextRows));
          setStockSupported(result.supported);
        },
        {
          resource: "stock_publish_rows",
          reason: options.reason,
        },
      );

      const totalCount =
        searchCompat
          ? totalCountRef.current || nextRows.length
          : result.meta.totalRowCount ?? totalCountRef.current ?? 0;
      totalCountRef.current = totalCount;
      loadedCountRef.current = append ? loadedCountRef.current + nextRows.length : nextRows.length;
      hasMoreRef.current = searchCompat ? false : result.meta.hasMore;

      unmountSafety.guardStateUpdate(
        () => {
          setStockCount(totalCount);
          setStockHasMore(hasMoreRef.current);
        },
        {
          resource: "stock_publish_meta",
          reason: options.reason,
        },
      );

      recordPlatformObservability({
        screen: "warehouse",
        surface: "stock_list",
        category: "ui",
        event: "content_ready",
        result: "success",
        rowCount: nextRows.length,
        sourceKind: result.sourceMeta.sourceKind,
        fallbackUsed: result.sourceMeta.fallbackUsed,
        extra: {
          primaryOwner: result.sourceMeta.primaryOwner,
          offset,
          limit,
          hasMore: hasMoreRef.current,
          totalRowCount: totalCount,
          returnedRowCount: result.meta.returnedRowCount,
          append,
          searchCompat,
          reason: options.reason,
        },
      });

      if (__DEV__) {
        console.info("[fetchStock] window", {
          projectionAvailable: result.projectionAvailable ?? null,
          projectionHitCount: result.projectionHitCount ?? null,
          projectionMissCount: result.projectionMissCount ?? null,
          projectionReadMs: result.projectionReadMs ?? null,
          fallbackReadMs: result.fallbackReadMs ?? null,
          primaryOwner: result.sourceMeta.primaryOwner,
          sourceKind: result.sourceMeta.sourceKind,
          offset,
          limit,
          totalRowCount: totalCount,
          hasMore: hasMoreRef.current,
          searchCompat,
        });
      }

      const missingCodes = selectCodesToRefresh(result.missingProjectionCodes ?? []);
      if (missingCodes.length > 0) {
        void scheduleWarehouseNameMapRefresh({
          supabase,
          codeList: missingCodes,
          refreshMode: "incremental",
        }).catch((error) => {
          if (__DEV__) {
            console.warn("[fetchStock] enqueue name-map refresh error", error);
          }
        });
      }

      applyLateEnrichment(nextRows, {
        append,
        fetchSeq,
        rikDeferredCodes: result.rikDeferredCodes,
        overrideCodes: result.overrideCodes,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("[fetchStock] error", error);
      }
    } finally {
      if (!options.reset) {
        unmountSafety.guardStateUpdate(
          () => {
            setStockLoadingMore(false);
          },
          {
            resource: "stock_loading_more_finish",
            reason: options.reason,
          },
        );
      }

        stockFetchInFlightRef.current = null;
        const queuedReset = queuedResetRef.current;
        const queuedAppend = queuedAppendRef.current;
        queuedResetRef.current = false;
        queuedAppendRef.current = false;

        if (
          !unmountSafety.shouldHandleAsyncResult({
            resource: "stock_fetch_rerun_dispatch",
            reason: options.reason,
          })
        ) {
          return;
        }

        if (queuedReset) {
          void fetchStockRef.current?.({ reset: true, reason: "refresh" });
        } else if (queuedAppend && hasMoreRef.current && !searchKey) {
        void fetchStockNextPageRef.current?.();
      }
    }
  }, [applyLateEnrichment, searchKey, selectCodesToRefresh, supabase, unmountSafety]);

  const fetchStock = useCallback(async (options?: {
    reset?: boolean;
    reason?: "initial" | "refresh" | "append" | "search" | "issue" | "receive";
  }) => {
    const reset = options?.reset ?? true;
    const reason = options?.reason ?? "refresh";

    if (!reset && (!hasMoreRef.current || searchKey.length > 0)) {
      return;
    }

    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "warehouse",
        surface: "stock_list",
        event: "fetch_stock",
        trigger: reason,
        extra: {
          reset,
          search: searchKey || null,
          networkKnownOffline: true,
        },
      });
      return;
    }

    if (stockFetchInFlightRef.current) {
      if (reset) queuedResetRef.current = true;
      else queuedAppendRef.current = true;
      recordPlatformObservability({
        screen: "warehouse",
        surface: "stock_list",
        category: "reload",
        event: "fetch_stock",
        result: "joined_inflight",
        extra: {
          reset,
          reason,
          queuedReset: queuedResetRef.current,
          queuedAppend: queuedAppendRef.current,
        },
      });
      return;
    }

    const task = runFetch({ reset, reason });
    stockFetchInFlightRef.current = task;
    await task;
  }, [runFetch, searchKey]);

  const fetchStockNextPage = useCallback(async () => {
    await fetchStock({ reset: false, reason: "append" });
  }, [fetchStock]);

  useEffect(() => {
    fetchStockRef.current = fetchStock;
    fetchStockNextPageRef.current = fetchStockNextPage;
  }, [fetchStock, fetchStockNextPage]);

  useEffect(
    () => () => {
      unmountSafety.runInteractionCleanup(() => {
        stockFetchInFlightRef.current = null;
        queuedResetRef.current = false;
        queuedAppendRef.current = false;
      }, {
        resource: "stock_fetch_refs_reset",
        reason: "warehouse_route_unmount",
      });
    },
    [unmountSafety],
  );

  useEffect(() => {
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true;
      return;
    }
    void fetchStock({ reset: true, reason: "search" });
  }, [fetchStock, searchKey]);

  return {
    stock,
    stockSupported,
    stockCount,
    stockHasMore,
    stockLoadingMore,
    fetchStock,
    fetchStockNextPage,
  };
}
