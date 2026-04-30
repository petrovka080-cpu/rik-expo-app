import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscribeChannel } from "../../../lib/realtime/realtime.client";
import {
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
} from "../../../lib/realtime/realtime.channels";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const TAB_EXPENSE = WAREHOUSE_TABS[2];

function logWarehouseExpenseRealtimeFallback(scope: string, error: unknown) {
  if (!__DEV__) return;
  console.warn(`[warehouse-expense-shared-rt] ${scope}`, error);
}

export function useWarehouseExpenseRealtime(params: {
  supabase: SupabaseClient;
  tab: Tab;
  fetchReqHeadsForce: () => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, tab, fetchReqHeadsForce } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    const triggerRefresh = () => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      if (inFlightRef.current) {
        pendingRefreshRef.current = true;
        return;
      }

      const task = fetchReqHeadsForce().finally(() => {
        if (inFlightRef.current === task) inFlightRef.current = null;
        if (
          pendingRefreshRef.current &&
          isWarehouseScreenActive(screenActiveRef)
        ) {
          pendingRefreshRef.current = false;
          triggerRefresh();
        } else if (!isWarehouseScreenActive(screenActiveRef)) {
          pendingRefreshRef.current = false;
        }
      });
      inFlightRef.current = task;
    };

    if (tab !== TAB_EXPENSE) {
      pendingRefreshRef.current = false;
      return;
    }

    const detach = subscribeChannel({
      client: supabase,
      name: WAREHOUSE_REALTIME_CHANNEL_NAME,
      scope: "warehouse",
      route: "/office/warehouse",
      surface: "expense_realtime",
      bindings: WAREHOUSE_REALTIME_BINDINGS,
      onEvent: ({ binding }) => {
        if (binding.table !== "requests" && binding.table !== "request_items") return;
        triggerRefresh();
      },
    });

    return () => {
      pendingRefreshRef.current = false;
      try {
        detach();
      } catch (error) {
        logWarehouseExpenseRealtimeFallback("detach", error);
      }
    };
  }, [supabase, tab, fetchReqHeadsForce, screenActiveRef]);
}
