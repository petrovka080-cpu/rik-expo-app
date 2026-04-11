import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const TAB_EXPENSE = WAREHOUSE_TABS[2];

function logWarehouseExpenseRealtimeFallback(scope: string, error: unknown) {
  if (!__DEV__) return;
  console.warn(`[warehouse-expense-rt] ${scope}`, error);
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

    const ch = supabase
      .channel("warehouse-expense-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "requests" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_items" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "request_items" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "request_items" },
        triggerRefresh,
      )
      .subscribe();

    return () => {
      pendingRefreshRef.current = false;
      try {
        ch.unsubscribe();
      } catch (error) {
        logWarehouseExpenseRealtimeFallback("unsubscribe", error);
      }
      try {
        supabase.removeChannel(ch);
      } catch (error) {
        logWarehouseExpenseRealtimeFallback("removeChannel", error);
      }
    };
  }, [supabase, tab, fetchReqHeadsForce, screenActiveRef]);
}
