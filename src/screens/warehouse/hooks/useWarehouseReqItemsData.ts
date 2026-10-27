import { useCallback, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchReqItems } from "../warehouse.requests.read";
import type { ReqItemUiRow } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export function useWarehouseReqItemsData(params: {
  supabase: SupabaseClient;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const [reqItems, setReqItems] = useState<ReqItemUiRow[]>([]);
  const [reqItemsLoading, setReqItemsLoading] = useState(false);

  const fetchReqItems = useCallback(
    async (requestId: string) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      setReqItemsLoading(true);
      try {
        const rows = await apiFetchReqItems(supabase, requestId);
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        setReqItems(rows);
      } finally {
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        setReqItemsLoading(false);
      }
    },
    [supabase, screenActiveRef],
  );

  return {
    reqItems,
    setReqItems,
    reqItemsLoading,
    setReqItemsLoading,
    fetchReqItems,
  };
}
