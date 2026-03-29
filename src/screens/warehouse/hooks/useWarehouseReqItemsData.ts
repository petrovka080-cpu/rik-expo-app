import { useCallback, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchReqItems } from "../warehouse.requests.read";
import type { ReqItemUiRow } from "../warehouse.types";

export function useWarehouseReqItemsData(params: { supabase: SupabaseClient }) {
  const { supabase } = params;
  const [reqItems, setReqItems] = useState<ReqItemUiRow[]>([]);
  const [reqItemsLoading, setReqItemsLoading] = useState(false);

  const fetchReqItems = useCallback(
    async (requestId: string) => {
      setReqItemsLoading(true);
      try {
        const rows = await apiFetchReqItems(supabase, requestId);
        setReqItems(rows);
      } finally {
        setReqItemsLoading(false);
      }
    },
    [supabase],
  );

  return {
    reqItems,
    setReqItems,
    reqItemsLoading,
    setReqItemsLoading,
    fetchReqItems,
  };
}
