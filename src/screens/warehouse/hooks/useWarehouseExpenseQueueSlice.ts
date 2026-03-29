import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { WAREHOUSE_TABS, type ReqHeadRow, type Tab } from "../warehouse.types";
import { useWarehouseReqHeads } from "./useWarehouseReqHeads";
import { useWarehouseReqItemsData } from "./useWarehouseReqItemsData";
import { useWarehouseReqModalFlow } from "./useWarehouseReqModalFlow";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";

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

const reqModalFieldsEqual = (left: ReqHeadRow, right: ReqHeadRow): boolean =>
  left.request_id === right.request_id &&
  left.display_no === right.display_no &&
  left.object_name === right.object_name &&
  left.level_code === right.level_code &&
  left.system_code === right.system_code &&
  left.zone_code === right.zone_code &&
  left.level_name === right.level_name &&
  left.system_name === right.system_name &&
  left.zone_name === right.zone_name &&
  left.contractor_name === right.contractor_name &&
  left.contractor_phone === right.contractor_phone &&
  left.planned_volume === right.planned_volume &&
  left.note === right.note &&
  left.comment === right.comment &&
  left.submitted_at === right.submitted_at &&
  left.items_cnt === right.items_cnt &&
  left.ready_cnt === right.ready_cnt &&
  left.done_cnt === right.done_cnt &&
  left.qty_limit_sum === right.qty_limit_sum &&
  left.qty_issued_sum === right.qty_issued_sum &&
  left.qty_left_sum === right.qty_left_sum &&
  left.qty_can_issue_now_sum === right.qty_can_issue_now_sum &&
  left.issuable_now_cnt === right.issuable_now_cnt &&
  left.issue_status === right.issue_status &&
  left.visible_in_expense_queue === right.visible_in_expense_queue &&
  left.can_issue_now === right.can_issue_now &&
  left.waiting_stock === right.waiting_stock &&
  left.all_done === right.all_done;

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
    reqHeadsHasMore,
    reqHeadsIntegrityState,
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

  const onReqEndReached = useCallback(() => {
    if (!reqRefs.current.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "warehouse",
        surface: "req_heads",
        event: "fetch_req_heads",
        trigger: "scroll",
        extra: { page: reqRefs.current.page },
      });
      return;
    }
    if (reqRefs.current.fetching) return;
    void fetchReqHeads(reqRefs.current.page + 1);
  }, [fetchReqHeads, reqRefs]);

  useEffect(() => {
    if (tab !== TAB_EXPENSE) {
      recordPlatformGuardSkip("inactive_tab", {
        screen: "warehouse",
        surface: "req_heads",
        event: "refresh_expense_queue",
        trigger: "tab",
        extra: { tab },
      });
      return;
    }

    const now = Date.now();
    if (
      isPlatformGuardCoolingDown({
        lastAt: lastTabRefreshAtRef.current,
        minIntervalMs: TAB_REFRESH_MIN_INTERVAL_MS,
        now,
      })
    ) {
      recordPlatformGuardSkip("recent_same_scope", {
        screen: "warehouse",
        surface: "req_heads",
        event: "refresh_expense_queue",
        trigger: "tab",
        extra: { tab },
      });
      return;
    }
    lastTabRefreshAtRef.current = now;

    void refreshExpenseQueue({
      force: hasActivatedExpenseRef.current,
      reason: "tab",
    }).catch((error) => onError(error));
  }, [onError, refreshExpenseQueue, tab]);

  useFocusEffect(
    useCallback(() => {
      if (tab !== TAB_EXPENSE) {
        recordPlatformGuardSkip("inactive_tab", {
          screen: "warehouse",
          surface: "req_heads",
          event: "refresh_expense_queue",
          trigger: "focus",
          extra: { tab },
        });
        return undefined;
      }

      const now = Date.now();
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastFocusRefreshAtRef.current,
          minIntervalMs: FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "warehouse",
          surface: "req_heads",
          event: "refresh_expense_queue",
          trigger: "focus",
          extra: { tab },
        });
        return undefined;
      }
      lastFocusRefreshAtRef.current = now;

      void refreshExpenseQueue({
        force: hasActivatedExpenseRef.current,
        reason: "focus",
      }).catch((error) => onError(error));

      return undefined;
    }, [onError, refreshExpenseQueue, tab]),
  );

  useEffect(() => {
    setReqModal((prev) => {
      if (!prev) return prev;
      const updated = reqHeads.find((row) => String(row.request_id) === String(prev.request_id));
      if (!updated) return prev;
      return reqModalFieldsEqual(prev, updated) ? prev : updated;
    });
  }, [reqHeads]);

  return {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqHeadsHasMore,
    reqHeadsIntegrityState,
    reqRefs,
    reqModal,
    reqItems,
    reqItemsLoading,
    fetchReqHeads,
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
