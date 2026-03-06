import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

type Params = {
  supabaseClient: any;
  mapCatalogSearchToWorkMaterials: (data: Record<string, unknown>[]) => WorkMaterialRow[];
  delayMs?: number;
};

export function useContractorWorkSearchController(params: Params) {
  const { supabaseClient, mapCatalogSearchToWorkMaterials, delayMs = 300 } = params;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkMaterialRow[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const clearPendingTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clear = useCallback(() => {
    seqRef.current += 1;
    clearPendingTimer();
    setQuery("");
    setResults([]);
  }, [clearPendingTimer]);

  const runSearch = useCallback(
    async (q: string, seq: number) => {
      try {
        const { data, error } = await supabaseClient.rpc("catalog_search", {
          p_query: q,
          p_kind: "material",
        });
        if (seq !== seqRef.current) return;
        if (error) {
          console.warn("[material_search/catalog_search] error:", error.message);
          return;
        }
        if (!Array.isArray(data)) return;
        setResults(mapCatalogSearchToWorkMaterials(data as Record<string, unknown>[]));
      } catch (e: unknown) {
        if (seq !== seqRef.current) return;
        const message = e instanceof Error ? e.message : String(e);
        console.warn("[material_search/catalog_search] exception:", message);
      }
    },
    [mapCatalogSearchToWorkMaterials, supabaseClient]
  );

  const onChange = useCallback(
    (text: string) => {
      setQuery(text);
      const q = text.trim();
      const seq = ++seqRef.current;
      clearPendingTimer();
      if (q.length < 2) {
        setResults([]);
        return;
      }
      timerRef.current = setTimeout(() => {
        void runSearch(q, seq);
      }, delayMs);
    },
    [clearPendingTimer, delayMs, runSearch]
  );

  useEffect(
    () => () => {
      seqRef.current += 1;
      clearPendingTimer();
    },
    [clearPendingTimer]
  );

  return {
    query,
    results,
    onChange,
    clear,
  };
}
