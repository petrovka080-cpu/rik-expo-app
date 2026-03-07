import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tab } from "../warehouse.types";

export function useWarehouseExpenseRealtime(params: {
  supabase: SupabaseClient;
  tab: Tab;
  fetchReqHeadsForce: () => Promise<void>;
}) {
  const { supabase, tab, fetchReqHeadsForce } = params;

  useEffect(() => {
    const ch = supabase
      .channel("warehouse-expense-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          if (tab !== "Расход") return;
          void fetchReqHeadsForce();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_items" },
        () => {
          if (tab !== "Расход") return;
          void fetchReqHeadsForce();
        },
      )
      .subscribe();

    return () => {
      try {
        ch.unsubscribe();
      } catch { }
      try {
        supabase.removeChannel(ch);
      } catch { }
    };
  }, [supabase, tab, fetchReqHeadsForce]);
}

