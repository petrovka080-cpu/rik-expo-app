import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

const TAB_EXPENSE = WAREHOUSE_TABS[2];
const RT_MIN_INTERVAL_MS = 800;

function logWarehouseExpenseRealtimeFallback(scope: string, error: unknown) {
  if (!__DEV__) return;
  console.warn(`[warehouse-expense-rt] ${scope}`, error);
}

export function useWarehouseExpenseRealtime(params: {
  supabase: SupabaseClient;
  tab: Tab;
  fetchReqHeadsForce: () => Promise<void>;
}) {
  const { supabase, tab, fetchReqHeadsForce } = params;
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastStartRef = useRef(0);

  useEffect(() => {
    const triggerRefresh = () => {
      if (tab !== TAB_EXPENSE) return;
      const now = Date.now();
      if (inFlightRef.current) return;
      if (now - lastStartRef.current < RT_MIN_INTERVAL_MS) return;

      lastStartRef.current = now;
      const task = fetchReqHeadsForce().finally(() => {
        if (inFlightRef.current === task) inFlightRef.current = null;
      });
      inFlightRef.current = task;
    };

    const ch = supabase
      .channel("warehouse-expense-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_items" }, triggerRefresh)
      .subscribe();

    return () => {
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
  }, [supabase, tab, fetchReqHeadsForce]);
}

