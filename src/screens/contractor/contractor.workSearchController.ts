import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

type Params = {
  supabaseClient: any;
  mapCatalogSearchToWorkMaterials: (data: Record<string, unknown>[]) => WorkMaterialRow[];
  delayMs?: number;
};

export function useContractorWorkSearchController(params: Params) {
  const { supabaseClient, mapCatalogSearchToWorkMaterials } = params;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkMaterialRow[]>([]);
  const deferredQuery = useDeferredValue(query);

  const seqRef = useRef(0);

  const clear = useCallback(() => {
    seqRef.current += 1;
    setQuery("");
    setResults([]);
  }, []);

  const runSearch = useCallback(
    async (q: string, seq: number) => {
      try {
        const { data, error } = await supabaseClient.rpc("catalog_search", {
          p_query: q,
          p_kind: "material",
        });
        if (seq !== seqRef.current) return;
        if (error) {
          if (__DEV__) console.warn("[material_search/catalog_search] error:", error.message);
          return;
        }
        if (!Array.isArray(data)) return;
        setResults(mapCatalogSearchToWorkMaterials(data as Record<string, unknown>[]));
      } catch (e: unknown) {
        if (seq !== seqRef.current) return;
        const message = e instanceof Error ? e.message : String(e);
        if (__DEV__) console.warn("[material_search/catalog_search] exception:", message);
      }
    },
    [mapCatalogSearchToWorkMaterials, supabaseClient]
  );

  const onChange = useCallback(
    (text: string) => {
      setQuery(text);
    },
    []
  );

  useEffect(() => {
    const q = deferredQuery.trim();
    const seq = ++seqRef.current;
    if (q.length < 2) {
      setResults([]);
      return;
    }
    void runSearch(q, seq);
  }, [deferredQuery, runSearch]);

  useEffect(() => () => {
    seqRef.current += 1;
  }, []);

  return {
    query,
    results,
    onChange,
    clear,
  };
}
