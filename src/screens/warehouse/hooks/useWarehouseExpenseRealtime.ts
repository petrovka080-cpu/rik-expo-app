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
  const pendingRefreshRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearScheduledRefresh = () => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const scheduleRefresh = (delayMs: number) => {
      pendingRefreshRef.current = true;
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!pendingRefreshRef.current) return;
        pendingRefreshRef.current = false;
        triggerRefresh();
      }, delayMs);
    };

    const triggerRefresh = () => {
      const now = Date.now();
      const remainingCooldown = RT_MIN_INTERVAL_MS - (now - lastStartRef.current);

      if (inFlightRef.current) {
        scheduleRefresh(Math.max(remainingCooldown, 0));
        return;
      }
      if (remainingCooldown > 0) {
        scheduleRefresh(remainingCooldown);
        return;
      }

      clearScheduledRefresh();
      lastStartRef.current = now;
      const task = fetchReqHeadsForce().finally(() => {
        if (inFlightRef.current === task) inFlightRef.current = null;
        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          const cooldownLeft = RT_MIN_INTERVAL_MS - (Date.now() - lastStartRef.current);
          if (cooldownLeft > 0) {
            scheduleRefresh(cooldownLeft);
          } else {
            triggerRefresh();
          }
        }
      });
      inFlightRef.current = task;
    };

    if (tab !== TAB_EXPENSE) {
      clearScheduledRefresh();
      pendingRefreshRef.current = false;
      return;
    }

    const ch = supabase
      .channel("warehouse-expense-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests" }, triggerRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, triggerRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "requests" }, triggerRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "request_items" }, triggerRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "request_items" }, triggerRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "request_items" }, triggerRefresh)
      .subscribe();

    return () => {
      clearScheduledRefresh();
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
  }, [supabase, tab, fetchReqHeadsForce]);
}

