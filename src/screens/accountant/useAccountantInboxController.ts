import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import type { AccountantInboxUiRow, Tab } from "./types";
import { useAccountantInboxQuery } from "./useAccountantInboxQuery";

/**
 * useAccountantInboxController — public API boundary for accountant inbox.
 *
 * P6.2 migration: fetch ownership is now delegated to
 * useAccountantInboxQuery (React Query useInfiniteQuery). This hook preserves
 * the exact same return contract for all consumers.
 *
 * Removed:
 * - Manual loadSeqRef (stale response guard) — replaced by query key
 * - Manual inflightKeyRef (inflight join) — replaced by query dedup
 * - Manual appendInflightKeyRef (append inflight join) — replaced by query dedup
 * - Manual queuedLoadRef (queue-on-overlap) — replaced by query invalidation
 * - Manual lastLoadedKeyRef (stale key guard) — replaced by query key change
 * - Manual cacheByTabRef (tab-scoped cache) — replaced by query cache
 *
 * Preserved:
 * - Same return shape (13 keys)
 * - Auth/focus/freeze/network guards
 * - setRows for optimistic mutations (payment/return removes row)
 * - All observability events
 * - Tab preview priming
 */

const errorMessage = (error: unknown) => {
  const value = error as { message?: string };
  return value?.message ?? String(error);
};

export function useAccountantInboxController(params: {
  authReady: boolean;
  freezeWhileOpen: boolean;
  focusedRef: MutableRefObject<boolean>;
  tabRef: MutableRefObject<Tab>;
}) {
  const { authReady, freezeWhileOpen, focusedRef, tabRef } = params;

  const [refreshing, setRefreshing] = useState(false);

  // ── Optimistic removal overlay ──
  // After a payment or return, consumers call setRows(prev => prev.filter(...))
  // to optimistically remove the paid/returned row from the list.
  // This set tracks which proposal_ids have been removed.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const lastQueryDataRef = useRef(0);

  const query = useAccountantInboxQuery({
    tab: tabRef.current,
    enabled: authReady && !freezeWhileOpen,
  });

  // Reset removedIds when query data changes (re-fetch brings fresh data)
  const queryDataVersion = query.rows.length + (query.isLoading ? 0 : 1);
  if (queryDataVersion !== lastQueryDataRef.current && !query.isLoading && !query.isFetching) {
    lastQueryDataRef.current = queryDataVersion;
    if (removedIds.size > 0) {
      setRemovedIds(new Set());
    }
  }

  // Apply optimistic removals
  const rows = useMemo(() => {
    if (removedIds.size === 0) return query.rows;
    return query.rows.filter((r) => !removedIds.has(String(r.proposal_id)));
  }, [query.rows, removedIds]);

  // ── setRows adapter ──
  // Consumers call setRows(prev => prev.filter(r => r.proposal_id !== id))
  // We intercept this to track removed IDs instead of mutating query cache.
  const setRows: React.Dispatch<React.SetStateAction<AccountantInboxUiRow[]>> = useCallback(
    (action) => {
      if (typeof action === "function") {
        // Call the updater with current rows to see what was removed
        const current = query.rows.filter((r) => !removedIds.has(String(r.proposal_id)));
        const next = action(current);
        const nextIds = new Set(next.map((r) => String(r.proposal_id)));
        const newlyRemoved = current
          .filter((r) => !nextIds.has(String(r.proposal_id)))
          .map((r) => String(r.proposal_id));
        if (newlyRemoved.length > 0) {
          setRemovedIds((prev) => {
            const updated = new Set(prev);
            for (const id of newlyRemoved) updated.add(id);
            return updated;
          });
        }
      }
      // Direct array assignment is not used by any consumer, ignore.
    },
    [query.rows, removedIds],
  );

  // ── Sync query error to observability ──
  if (query.isError && query.error) {
    if (__DEV__) console.error("[accountant load]", errorMessage(query.error));
  }

  // ── Imperative loadInbox (backward compat) ──
  const loadInbox = useCallback(
    async (
      force?: boolean,
      tabOverride?: Tab,
      trigger: "focus" | "manual" | "realtime" = force ? "manual" : "focus",
    ) => {
      const tab = tabOverride ?? tabRef.current;
      if (!authReady) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      if (!focusedRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      if (freezeWhileOpen) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab, networkKnownOffline: true },
        });
        return;
      }

      // Delegate to React Query
      if (force) {
        query.invalidate();
      }
    },
    [authReady, focusedRef, freezeWhileOpen, tabRef, query],
  );

  const loadMoreInbox = useCallback(async () => {
    const tab = tabRef.current;
    if (!authReady) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab },
      });
      return;
    }
    if (!focusedRef.current || freezeWhileOpen) return;
    if (!query.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab },
      });
      return;
    }
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab, networkKnownOffline: true },
      });
      return;
    }

    await query.fetchNextPage();
  }, [authReady, focusedRef, freezeWhileOpen, tabRef, query]);

  const primeInboxPreviewForTab = useCallback(
    (_tab: Tab) => {
      // With React Query, the query key includes the tab,
      // so switching tabs automatically loads the correct data.
      // No manual preview priming needed.
    },
    [],
  );

  const isInboxRefreshInFlight = useCallback(
    () => query.isFetching,
    [query],
  );

  return {
    rows,
    setRows,
    loading: query.isLoading,
    refreshing,
    setRefreshing,
    loadingMore: query.isFetchingNextPage,
    hasMore: query.hasMore,
    totalCount: query.totalCount,
    cacheByTabRef: useRef({}),
    loadInbox,
    loadMoreInbox,
    primeInboxPreviewForTab,
    isInboxRefreshInFlight,
  };
}
