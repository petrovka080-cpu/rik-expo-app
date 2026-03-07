import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiFetchStock } from "../warehouse.api";
import type { StockRow } from "../warehouse.types";

export function useWarehouseStockData(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);
  const [stockCount, setStockCount] = useState(0);
  const stockFetchMutex = useRef(false);

  const fetchStock = useCallback(async () => {
    if (stockFetchMutex.current) return;

    stockFetchMutex.current = true;
    try {
      const r = await apiFetchStock(supabase, 0, 2000);
      const newRows = r.rows || [];
      setStock(newRows);
      setStockCount(newRows.length);
      setStockSupported(r.supported);
    } catch (e) {
      console.warn("[fetchStock] error", e);
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

