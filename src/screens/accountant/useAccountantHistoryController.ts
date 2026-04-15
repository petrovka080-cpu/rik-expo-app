import { useCallback, useState, type MutableRefObject } from "react";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import type { Tab } from "./types";
import { buildAccountantHistoryKey } from "./accountant.selectors";
import { useAccountantHistoryQuery } from "./useAccountantHistoryQuery";

/**
 * useAccountantHistoryController — public API boundary for accountant history.
 *
 * P6.2 migration: fetch ownership is now delegated to
 * useAccountantHistoryQuery (React Query useInfiniteQuery). This hook preserves
 * the exact same return contract for all consumers.
 *
 * Removed:
 * - Manual historySeqRef (stale response guard) — replaced by query key
 * - Manual historyInflightKeyRef (inflight join) — replaced by query dedup
 * - Manual historyAppendInflightKeyRef (append inflight join) — replaced by query dedup
 * - Manual historyQueuedRef (queue-on-overlap) — replaced by query invalidation
 * - Manual lastLoadedHistKeyRef (stale key guard) — replaced by query key change
 * - Manual observedHistKeyRef (filter dedup) — replaced by query key includes filters
 * - Manual historySnapshotRef (snapshot cache) — replaced by query cache
 *
 * Preserved:
 * - Same return shape (14 keys)
 * - Auth/focus/freeze/tab/network guards
 * - All observability events
 * - Filter-driven reload (syncHistoryFilterLoad)
 */

const errorMessage = (error: unknown) => {
  const value = error as { message?: string };
  return value?.message ?? String(error);
};

export function useAccountantHistoryController(params: {
  authReady: boolean;
  freezeWhileOpen: boolean;
  focusedRef: MutableRefObject<boolean>;
  tabRef: MutableRefObject<Tab>;
  tabHistory: Tab;
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (value: string) => string | null;
}) {
  const { authReady, freezeWhileOpen, focusedRef, tabRef, tabHistory, dateFrom, dateTo, histSearch, toRpcDateOrNull } =
    params;

  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  const query = useAccountantHistoryQuery({
    dateFrom,
    dateTo,
    histSearch,
    toRpcDateOrNull,
    enabled: authReady && !freezeWhileOpen && tabRef.current === tabHistory,
  });

  // ── Sync query error to observability ──
  if (query.isError && query.error) {
    if (__DEV__) console.error("[history load]", errorMessage(query.error));
  }

  // ── Imperative loadHistory (backward compat) ──
  const loadHistory = useCallback(
    async (force?: boolean, trigger: "focus" | "manual" | "realtime" = force ? "manual" : "focus") => {
      if (!authReady) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "accountant",
          surface: "history_list",
          event: "load_history",
          trigger,
        });
        return;
      }
      if (!focusedRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen: "accountant",
          surface: "history_list",
          event: "load_history",
          trigger,
        });
        return;
      }
      if (freezeWhileOpen) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "accountant",
          surface: "history_list",
          event: "load_history",
          trigger,
        });
        return;
      }
      if (tabRef.current !== tabHistory) {
        recordPlatformGuardSkip("inactive_tab", {
          screen: "accountant",
          surface: "history_list",
          event: "load_history",
          trigger,
          extra: { tab: tabRef.current },
        });
        return;
      }
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "accountant",
          surface: "history_list",
          event: "load_history",
          trigger,
          extra: {
            key: buildAccountantHistoryKey(dateFrom, dateTo, histSearch),
            networkKnownOffline: true,
          },
        });
        return;
      }

      // Delegate to React Query
      if (force) {
        query.invalidate();
      }
    },
    [authReady, dateFrom, dateTo, focusedRef, freezeWhileOpen, histSearch, query, tabHistory, tabRef],
  );

  const loadMoreHistory = useCallback(async () => {
    if (!authReady) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "accountant",
        surface: "history_list",
        event: "load_history_page",
        trigger: "scroll",
      });
      return;
    }
    if (!focusedRef.current || freezeWhileOpen || tabRef.current !== tabHistory) return;
    if (!query.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "accountant",
        surface: "history_list",
        event: "load_history_page",
        trigger: "scroll",
      });
      return;
    }
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "accountant",
        surface: "history_list",
        event: "load_history_page",
        trigger: "scroll",
        extra: { networkKnownOffline: true },
      });
      return;
    }

    await query.fetchNextPage();
  }, [authReady, focusedRef, freezeWhileOpen, tabHistory, tabRef, query]);

  const syncHistoryFilterLoad = useCallback(() => {
    // With React Query, the query key includes dateFrom/dateTo/histSearch.
    // When filters change, the key changes, and React Query automatically
    // re-fetches. No manual filter-driven reload needed.
    // This is a no-op adapter for backward compat.
  }, []);

  const resetObservedHistoryKey = useCallback(() => {
    // With React Query, there is no observed key — the query key
    // handles filter dedup automatically.
  }, []);

  const isHistoryRefreshInFlight = useCallback(
    () => query.isFetching,
    [query],
  );

  return {
    historyRows: query.rows,
    historyLoading: query.isLoading,
    historyRefreshing,
    setHistoryRefreshing,
    historyLoadingMore: query.isFetchingNextPage,
    historyHasMore: query.hasMore,
    historyTotalCount: query.totalCount,
    historyTotalAmount: query.totalAmount,
    historyCurrency: query.currency,
    loadHistory,
    loadMoreHistory,
    syncHistoryFilterLoad,
    resetObservedHistoryKey,
    isHistoryRefreshInFlight,
  };
}
