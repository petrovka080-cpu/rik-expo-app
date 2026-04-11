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
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

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
  setReqQtyInputByItem: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
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
  isScreenFocused: boolean;
  pageSize: number;
  reqPickUi: ReqPickUiLike;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (error: unknown) => void;
}) {
  const { supabase, tab, isScreenFocused, pageSize, reqPickUi, onError } =
    params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const [reqModal, setReqModal] = useState<ReqHeadRow | null>(null);
  const {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqHeadsHasMore,
    reqHeadsIntegrityState,
    reqHeadsListState,
    reqRefs,
    fetchReqHeads,
  } = useWarehouseReqHeads({
    supabase,
    pageSize,
    screenActiveRef,
  });
  const {
    reqItems,
    setReqItems,
    reqItemsLoading,
    setReqItemsLoading,
    fetchReqItems,
  } = useWarehouseReqItemsData({ supabase, screenActiveRef });
  const { openReq, closeReq } = useWarehouseReqModalFlow({
    supabase,
    reqPickUi,
    setReqModal,
    setReqItems,
    setReqItemsLoading,
    screenActiveRef,
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
      if (!isWarehouseScreenActive(screenActiveRef)) {
        refreshStateRef.current.rerunQueued = false;
        refreshStateRef.current.rerunForce = false;
        return Promise.resolve();
      }

      const startRefresh = (nextForce: boolean) => {
        const task = (async () => {
          try {
            if (!isWarehouseScreenActive(screenActiveRef)) return;
            await fetchReqHeads(0, nextForce);
            if (!isWarehouseScreenActive(screenActiveRef)) return;
            hasActivatedExpenseRef.current = true;
          } finally {
            refreshStateRef.current.inFlight = null;
            if (
              refreshStateRef.current.rerunQueued &&
              isWarehouseScreenActive(screenActiveRef)
            ) {
              const rerunForce = refreshStateRef.current.rerunForce;
              refreshStateRef.current.rerunQueued = false;
              refreshStateRef.current.rerunForce = false;
              void startRefresh(rerunForce);
            } else if (!isWarehouseScreenActive(screenActiveRef)) {
              refreshStateRef.current.rerunQueued = false;
              refreshStateRef.current.rerunForce = false;
            }
          }
        })();

        if (__DEV__) {
          console.info("[warehouse.expenseQueue] refresh", {
            force: nextForce,
            reason,
          });
        }

        refreshStateRef.current.inFlight = task;
        return task;
      };

      if (refreshStateRef.current.inFlight) {
        refreshStateRef.current.rerunQueued = true;
        refreshStateRef.current.rerunForce =
          refreshStateRef.current.rerunForce || force;
        return refreshStateRef.current.inFlight;
      }

      return startRefresh(force);
    },
    [fetchReqHeads, screenActiveRef],
  );

  const onReqEndReached = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
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
  }, [fetchReqHeads, reqRefs, screenActiveRef]);

  useEffect(() => {
    if (!isScreenFocused) {
      recordPlatformGuardSkip("not_focused", {
        screen: "warehouse",
        surface: "req_heads",
        event: "refresh_expense_queue",
        trigger: "tab",
        extra: { tab },
      });
      return;
    }
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
    }).catch((error) => {
      if (isWarehouseScreenActive(screenActiveRef)) onError(error);
    });
  }, [isScreenFocused, onError, refreshExpenseQueue, screenActiveRef, tab]);

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
      }).catch((error) => {
        if (isWarehouseScreenActive(screenActiveRef)) onError(error);
      });

      return undefined;
    }, [onError, refreshExpenseQueue, screenActiveRef, tab]),
  );

  useEffect(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setReqModal((prev) => {
      if (!prev) return prev;
      const updated = reqHeads.find(
        (row) => String(row.request_id) === String(prev.request_id),
      );
      if (!updated) return prev;
      return reqModalFieldsEqual(prev, updated) ? prev : updated;
    });
  }, [reqHeads, screenActiveRef]);

  return {
    reqHeads,
    reqHeadsLoading,
    reqHeadsFetchingPage,
    reqHeadsHasMore,
    reqHeadsIntegrityState,
    reqHeadsListState,
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

export type WarehouseExpenseQueueSlice = ReturnType<
  typeof useWarehouseExpenseQueueSlice
>;
