import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiEnrichStockNamesFromRikRu, apiFetchStock } from "../warehouse.api";
import { scheduleWarehouseNameMapRefresh } from "../warehouse.nameMap.ui";
import type { StockRow } from "../warehouse.types";

const NAME_MAP_ENQUEUE_TTL_MS = 60_000;

export function useWarehouseStockData(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);
  const [stockCount, setStockCount] = useState(0);
  const stockFetchMutex = useRef(false);
  const stockFetchSeqRef = useRef(0);
  const enqueuedCodeAtRef = useRef<Record<string, number>>({});

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

  const fetchStock = useCallback(async () => {
    if (stockFetchMutex.current) return;

    stockFetchMutex.current = true;
    const fetchSeq = stockFetchSeqRef.current + 1;
    stockFetchSeqRef.current = fetchSeq;
    try {
      const r = await apiFetchStock(supabase, 0, 2000);
      const newRows = r.rows || [];
      setStock(newRows);
      setStockCount(newRows.length);
      setStockSupported(r.supported);

      if (__DEV__) {
        console.info("[fetchStock] projection", {
          projectionAvailable: r.projectionAvailable ?? null,
          projectionHitCount: r.projectionHitCount ?? null,
          projectionMissCount: r.projectionMissCount ?? null,
          projectionReadMs: r.projectionReadMs ?? null,
          fallbackReadMs: r.fallbackReadMs ?? null,
        });
      }

      const missingCodes = selectCodesToRefresh(r.missingProjectionCodes ?? []);
      if (missingCodes.length > 0) {
        void scheduleWarehouseNameMapRefresh({
          supabase,
          codeList: missingCodes,
          refreshMode: "incremental",
        }).catch((e) => {
          if (__DEV__) {
            console.warn("[fetchStock] enqueue name-map refresh error", e);
          }
        });
      } else if (__DEV__ && (r.missingProjectionCodes?.length ?? 0) > 0) {
        console.info("[fetchStock] projection refresh deduped", {
          requested: r.missingProjectionCodes?.length ?? 0,
        });
      }

      // Temporary repair path: keep stock truth and first paint fast,
      // then upgrade labels from v_rik_names_ru outside the blocking path.
      if ((r.rikDeferredCodes?.length ?? 0) > 0) {
        void apiEnrichStockNamesFromRikRu(supabase, newRows, {
          rikDeferredCodes: r.rikDeferredCodes,
          overrideCodes: r.overrideCodes,
        })
          .then((enrichedRows) => {
            if (stockFetchSeqRef.current !== fetchSeq) return;
            setStock(enrichedRows);
          })
          .catch((e) => {
            if (__DEV__) {
              console.warn("[fetchStock] late rik enrichment error", e);
            }
          });
      }
    } catch (e) {
      if (__DEV__) {
        console.warn("[fetchStock] error", e);
      }
    } finally {
      stockFetchMutex.current = false;
    }
  }, [supabase]);

  return {
    stock,
    stockSupported,
    stockCount,
    fetchStock,
  };
}
