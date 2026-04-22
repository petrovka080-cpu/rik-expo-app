import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { WAREHOUSE_TABS, type ReqHeadRow, type Tab } from "../warehouse.types";
import { useAppActiveRevalidation } from "../../../lib/lifecycle/useAppActiveRevalidation";
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

type RefreshReason =
  | "tab"
  | "focus"
  | "manual"
  | "issue"
  | "realtime"
  | "app_active";

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

/**
 * useWarehouseExpenseQueueSlice — orchestration coordinator for the expense tab.
 *
 * P6.1c migration: the manual inflight join + queue-rerun pattern
 * (refreshStateRef) has been removed. Since useWarehouseReqHeads (P6.1b)
 * now delegates to React Query's useInfiniteQuery, dedup and inflight
 * management are handled by the query layer.
 *
 * Removed:
 * - refreshStateRef (inFlight / rerunQueued / rerunForce)
 * - startRefresh inner function with queue-on-overlap
 * - Manual inflight join (return existing promise)
 *
 * Preserved:
 * - Same return contract (18 keys)
 * - Tab-switch cooldown (TAB_REFRESH_MIN_INTERVAL_MS = 600ms)
 * - Focus cooldown (FOCUS_REFRESH_MIN_INTERVAL_MS = 1200ms)
 * - hasActivatedExpenseRef (first-activation semantics)
 * - onReqEndReached (pagination trigger via reqRefs)
 * - reqModal sync (UI modal state)
 * - Screen activity guards
 * - All observability events
 */
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

  const hasActivatedExpenseRef = useRef(false);
  const lastTabRefreshAtRef = useRef(0);
  const lastFocusRefreshAtRef = useRef(0);

  /**
   * P6.1c: simplified refreshExpenseQueue.
   *
   * The old version had a manual inflight join + queue-rerun pattern:
   * - refreshStateRef.inFlight tracked the in-flight promise
   * - refreshStateRef.rerunQueued / rerunForce queued a rerun after completion
   * - if a refresh was in-flight, callers would join the existing promise
   *
   * This is now handled by React Query's built-in dedup in useWarehouseReqHeadsQuery:
   * - fetchReqHeads(0, force) calls query.invalidate()
   * - React Query deduplicates concurrent invalidations
   * - No manual inflight tracking needed
   */
  const refreshExpenseQueue = useCallback(
    async (options?: { force?: boolean; reason?: RefreshReason }) => {
      const force = !!options?.force;
      const reason = options?.reason ?? "manual";
      if (!isWarehouseScreenActive(screenActiveRef)) return;

      if (__DEV__) {
        console.info("[warehouse.expenseQueue] refresh", { force, reason });
      }

      await fetchReqHeads(0, force);
      if (isWarehouseScreenActive(screenActiveRef)) {
        hasActivatedExpenseRef.current = true;
      }
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

  useAppActiveRevalidation({
    screen: "warehouse",
    surface: "req_heads",
    enabled: isScreenFocused && tab === TAB_EXPENSE && isWarehouseScreenActive(screenActiveRef),
    onRevalidate: async () => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      await refreshExpenseQueue({
        force: hasActivatedExpenseRef.current,
        reason: "app_active",
      });
    },
    isInFlight: () => reqRefs.current.fetching,
  });

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
