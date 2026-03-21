import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { WAREHOUSE_TABS, type ReqHeadRow, type Tab } from "../warehouse.types";
import { useWarehouseExpenseRealtime } from "./useWarehouseExpenseRealtime";
import { useWarehouseReqHeads } from "./useWarehouseReqHeads";
import { useWarehouseReqItemsData } from "./useWarehouseReqItemsData";
import { useWarehouseReqModalFlow } from "./useWarehouseReqModalFlow";

const TAB_EXPENSE = WAREHOUSE_TABS[2];
const FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;
const TAB_REFRESH_MIN_INTERVAL_MS = 600;

type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunForce: boolean;
};

type RefreshReason = "tab" | "focus" | "manual" | "issue" | "realtime";

type ReqPickUiLike = {
  setReqQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearReqPick: () => void;
};

export function useWarehouseExpenseQueueSlice(params: {
  supabase: SupabaseClient;
  tab: Tab;
  pageSize: number;
  reqPickUi: ReqPickUiLike;
  onError: (error: unknown) => void;
}) {
  const { supabase, tab, pageSize, reqPickUi, onError } = params;

  const [reqModal, setReqModal] = useState<ReqHeadRow | null>(null);
  const {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqRefs,
    fetchReqHeads,
  } = useWarehouseReqHeads({
    supabase,
    pageSize,
  });
  const {
    reqItems,
    setReqItems,
    reqItemsLoading,
    setReqItemsLoading,
    fetchReqItems,
  } = useWarehouseReqItemsData({ supabase });
  const { openReq, closeReq } = useWarehouseReqModalFlow({
    supabase,
    reqPickUi,
    setReqModal,
    setReqItems,
    setReqItemsLoading,
    onError,
  });

  const refreshStateRef = useRef<RefreshState>({
    inFlight: null,
    rerunQueued: false,
    rerunForce: false,
  });
  const hasActivatedExpenseRef = useRef(false);
  const lastTabRefreshAtRef = useRef(0);
  const lastFocusRefreshAtRef = useRef(0);

  const refreshExpenseQueue = useCallback(
    (options?: { force?: boolean; reason?: RefreshReason }) => {
      const force = !!options?.force;
      const reason = options?.reason ?? "manual";

      const startRefresh = (nextForce: boolean) => {
        const task = (async () => {
          try {
            await fetchReqHeads(0, nextForce);
            hasActivatedExpenseRef.current = true;
          } finally {
            refreshStateRef.current.inFlight = null;
            if (refreshStateRef.current.rerunQueued) {
              const rerunForce = refreshStateRef.current.rerunForce;
              refreshStateRef.current.rerunQueued = false;
              refreshStateRef.current.rerunForce = false;
              void startRefresh(rerunForce);
            }
          }
        })();

        if (__DEV__) {
          console.info("[warehouse.expenseQueue] refresh", { force: nextForce, reason });
        }

        refreshStateRef.current.inFlight = task;
        return task;
      };

      if (refreshStateRef.current.inFlight) {
        refreshStateRef.current.rerunQueued = true;
        refreshStateRef.current.rerunForce = refreshStateRef.current.rerunForce || force;
        return refreshStateRef.current.inFlight;
      }

      return startRefresh(force);
    },
    [fetchReqHeads],
  );

  const fetchReqHeadsForce = useCallback(() => {
    return refreshExpenseQueue({ force: true, reason: "realtime" });
  }, [refreshExpenseQueue]);

  const onReqEndReached = useCallback(() => {
    if (reqRefs.current.hasMore && !reqRefs.current.fetching) {
      void fetchReqHeads(reqRefs.current.page + 1);
    }
  }, [fetchReqHeads, reqRefs]);

  useEffect(() => {
    if (tab !== TAB_EXPENSE) return;

    const now = Date.now();
    if (now - lastTabRefreshAtRef.current < TAB_REFRESH_MIN_INTERVAL_MS) return;
    lastTabRefreshAtRef.current = now;

    void refreshExpenseQueue({
      force: hasActivatedExpenseRef.current,
      reason: "tab",
    }).catch((error) => onError(error));
  }, [onError, refreshExpenseQueue, tab]);

  useFocusEffect(
    useCallback(() => {
      if (tab !== TAB_EXPENSE) return undefined;

      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < FOCUS_REFRESH_MIN_INTERVAL_MS) return undefined;
      lastFocusRefreshAtRef.current = now;

      void refreshExpenseQueue({
        force: hasActivatedExpenseRef.current,
        reason: "focus",
      }).catch((error) => onError(error));

      return undefined;
    }, [onError, refreshExpenseQueue, tab]),
  );

  useWarehouseExpenseRealtime({
    supabase,
    tab,
    fetchReqHeadsForce,
  });

  useEffect(() => {
    if (!reqModal) return;

    setReqModal((prev) => {
      if (!prev) return prev;
      const updated = reqHeads.find((row) => String(row.request_id) === String(prev.request_id));
      if (!updated) return prev;

      return {
        ...prev,
        ...updated,
        note: prev.note ?? updated.note ?? null,
        comment: prev.comment ?? updated.comment ?? null,
        contractor_name: prev.contractor_name ?? updated.contractor_name ?? null,
        contractor_phone: prev.contractor_phone ?? updated.contractor_phone ?? null,
        planned_volume: prev.planned_volume ?? updated.planned_volume ?? null,
      };
    });
  }, [reqHeads, reqModal]);

  return {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqRefs,
    reqModal,
    reqItems,
    reqItemsLoading,
    fetchReqHeads,
    fetchReqHeadsForce,
    refreshExpenseQueue,
    fetchReqItems,
    openReq,
    closeReq,
    onReqEndReached,
    selectedExpenseRequestId: String(reqModal?.request_id ?? "").trim() || null,
    selectedExpenseDisplayNo: reqModal?.display_no ?? null,
  };
}

export type WarehouseExpenseQueueSlice = ReturnType<typeof useWarehouseExpenseQueueSlice>;
