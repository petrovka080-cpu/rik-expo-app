import { useCallback, useRef, useState, type MutableRefObject } from "react";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import { runNextTick } from "./helpers";
import {
  ACCOUNTANT_HISTORY_PAGE_SIZE,
  loadAccountantHistoryPage,
  type AccountantLoadTrigger,
} from "./accountant.repository";
import {
  buildAccountantHistoryKey,
  buildAccountantHistorySnapshot,
  selectAccountantHistoryPreview,
  type HistoryWindowSnapshot,
} from "./accountant.selectors";
import type { HistoryRow, Tab } from "./types";

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

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyTotalAmount, setHistoryTotalAmount] = useState(0);
  const [historyCurrency, setHistoryCurrency] = useState("KGS");

  const historySeqRef = useRef(0);
  const historyInflightKeyRef = useRef<string | null>(null);
  const historyAppendInflightKeyRef = useRef<string | null>(null);
  const historyQueuedRef = useRef<{ force: boolean; key: string } | null>(null);
  const lastLoadedHistKeyRef = useRef<string>("");
  const observedHistKeyRef = useRef<string>("");
  const historySnapshotRef = useRef<HistoryWindowSnapshot | null>(null);

  const applyPreview = useCallback((preview: HistoryWindowSnapshot | null) => {
    if (preview) {
      setHistoryRows(preview.rows);
      setHistoryHasMore(preview.hasMore);
      setHistoryTotalCount(preview.totalRowCount);
      setHistoryTotalAmount(preview.totalAmount);
      setHistoryCurrency(preview.currency);
      return;
    }
    setHistoryRows((prev) => (prev.length ? [] : prev));
    setHistoryHasMore(false);
    setHistoryTotalCount(0);
    setHistoryTotalAmount(0);
    setHistoryCurrency("KGS");
  }, []);

  const loadHistory = useCallback(
    async (force?: boolean, trigger: AccountantLoadTrigger = force ? "manual" : "focus") => {
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

      const key = buildAccountantHistoryKey(dateFrom, dateTo, histSearch);
      if (historyInflightKeyRef.current || historyAppendInflightKeyRef.current) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "history_list",
          category: "reload",
          event: "load_history",
          result: "queued_rerun",
          trigger,
        });
        historyQueuedRef.current = {
          force: Boolean(force) || historyQueuedRef.current?.force === true,
          key,
        };
        return;
      }
      if (!force && lastLoadedHistKeyRef.current === key) return;

      const cached = selectAccountantHistoryPreview(historySnapshotRef.current, key);
      applyPreview(cached);
      setHistoryLoading(!(cached && cached.rows.length > 0));
      historyInflightKeyRef.current = key;
      const seq = ++historySeqRef.current;
      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "history_list",
        category: "fetch",
        event: "load_history",
        sourceKind: "rpc:accountant_history_scope_v1",
        trigger,
      });
      try {
        const result = await loadAccountantHistoryPage({
          dateFrom,
          dateTo,
          histSearch,
          offsetRows: 0,
          limitRows: ACCOUNTANT_HISTORY_PAGE_SIZE,
          toRpcDateOrNull,
        });
        if (seq !== historySeqRef.current) return;
        if (!focusedRef.current || tabRef.current !== tabHistory) return;
        const snapshot = buildAccountantHistorySnapshot({
          key,
          previous: cached,
          result,
          append: false,
        });
        historySnapshotRef.current = snapshot;
        setHistoryHasMore(snapshot.hasMore);
        setHistoryTotalCount(snapshot.totalRowCount);
        setHistoryTotalAmount(snapshot.totalAmount);
        setHistoryCurrency(snapshot.currency);
        setHistoryRows(snapshot.rows);
        recordPlatformObservability({
          screen: "accountant",
          surface: "history_list",
          category: "ui",
          event: "content_ready",
          result: "success",
          rowCount: snapshot.rows.length,
          extra: {
            totalRowCount: snapshot.totalRowCount,
            totalAmount: snapshot.totalAmount,
          },
        });
        observation.success({
          rowCount: snapshot.rows.length,
          sourceKind: result.sourceMeta.sourceKind,
          fallbackUsed: result.sourceMeta.fallbackUsed,
          extra: {
            primaryOwner: result.sourceMeta.primaryOwner,
            backendFirstPrimary: result.sourceMeta.backendFirstPrimary,
            offsetRows: result.meta.offsetRows,
            limitRows: result.meta.limitRows,
            returnedRowCount: result.meta.returnedRowCount,
            totalRowCount: result.meta.totalRowCount,
            totalAmount: result.meta.totalAmount,
            hasMore: result.meta.hasMore,
          },
        });
        lastLoadedHistKeyRef.current = key;
      } catch (error: unknown) {
        console.error("[history load]", errorMessage(error));
        observation.error(error, {
          rowCount: 0,
          errorStage: "load_history_scope_v1",
        });
        if (seq === historySeqRef.current && focusedRef.current && tabRef.current === tabHistory) {
          historySnapshotRef.current = null;
          applyPreview(null);
        }
      } finally {
        if (seq === historySeqRef.current) setHistoryLoading(false);
        historyInflightKeyRef.current = null;
        const queued = historyQueuedRef.current;
        historyQueuedRef.current = null;
        if (
          queued &&
          focusedRef.current &&
          !freezeWhileOpen &&
          tabRef.current === tabHistory &&
          (queued.force || queued.key !== lastLoadedHistKeyRef.current)
        ) {
          runNextTick(() => {
            void loadHistory(queued.force);
          });
        }
      }
    },
    [
      applyPreview,
      authReady,
      dateFrom,
      dateTo,
      focusedRef,
      freezeWhileOpen,
      histSearch,
      tabHistory,
      tabRef,
      toRpcDateOrNull,
    ],
  );

  const loadMoreHistory = useCallback(async () => {
    const key = buildAccountantHistoryKey(dateFrom, dateTo, histSearch);
    const current = selectAccountantHistoryPreview(historySnapshotRef.current, key);
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
    if (!current?.hasMore) {
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
        extra: { networkKnownOffline: true, key },
      });
      return;
    }
    if (historyInflightKeyRef.current || historyAppendInflightKeyRef.current) {
      recordPlatformObservability({
        screen: "accountant",
        surface: "history_list",
        category: "reload",
        event: "load_history_page",
        result: "joined_inflight",
        trigger: "scroll",
      });
      return;
    }

    historyAppendInflightKeyRef.current = `${key}:${current.nextOffsetRows}`;
    setHistoryLoadingMore(true);
    const observation = beginPlatformObservability({
      screen: "accountant",
      surface: "history_list",
      category: "fetch",
      event: "load_history_page",
      sourceKind: "rpc:accountant_history_scope_v1",
      trigger: "scroll",
    });
    try {
      const result = await loadAccountantHistoryPage({
        dateFrom,
        dateTo,
        histSearch,
        offsetRows: current.nextOffsetRows,
        limitRows: current.limitRows,
        toRpcDateOrNull,
      });
      if (!focusedRef.current || tabRef.current !== tabHistory) return;
      const snapshot = buildAccountantHistorySnapshot({
        key,
        previous: current,
        result,
        append: true,
      });
      historySnapshotRef.current = snapshot;
      setHistoryHasMore(snapshot.hasMore);
      setHistoryTotalCount(snapshot.totalRowCount);
      setHistoryTotalAmount(snapshot.totalAmount);
      setHistoryCurrency(snapshot.currency);
      setHistoryRows(snapshot.rows);
      observation.success({
        rowCount: result.rows.length,
        sourceKind: result.sourceMeta.sourceKind,
        fallbackUsed: result.sourceMeta.fallbackUsed,
        extra: {
          primaryOwner: result.sourceMeta.primaryOwner,
          offsetRows: result.meta.offsetRows,
          limitRows: result.meta.limitRows,
          returnedRowCount: result.meta.returnedRowCount,
          totalRowCount: result.meta.totalRowCount,
          hasMore: result.meta.hasMore,
          mergedRowCount: snapshot.rows.length,
        },
      });
    } catch (error: unknown) {
      console.error("[history load more]", errorMessage(error));
      observation.error(error, {
        rowCount: 0,
        errorStage: "load_history_scope_v1_page",
      });
    } finally {
      historyAppendInflightKeyRef.current = null;
      setHistoryLoadingMore(false);
    }
  }, [
    authReady,
    dateFrom,
    dateTo,
    focusedRef,
    freezeWhileOpen,
    histSearch,
    tabHistory,
    tabRef,
    toRpcDateOrNull,
  ]);

  const syncHistoryFilterLoad = useCallback(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;
    if (tabRef.current !== tabHistory) return;

    const key = buildAccountantHistoryKey(dateFrom, dateTo, histSearch);
    if (observedHistKeyRef.current === key) return;
    observedHistKeyRef.current = key;
    void loadHistory(true);
  }, [dateFrom, dateTo, focusedRef, freezeWhileOpen, histSearch, loadHistory, tabHistory, tabRef]);

  const resetObservedHistoryKey = useCallback(() => {
    observedHistKeyRef.current = "";
  }, []);

  const isHistoryRefreshInFlight = useCallback(
    () => Boolean(historyInflightKeyRef.current || historyAppendInflightKeyRef.current),
    [],
  );

  return {
    historyRows,
    historyLoading,
    historyRefreshing,
    setHistoryRefreshing,
    historyLoadingMore,
    historyHasMore,
    historyTotalCount,
    historyTotalAmount,
    historyCurrency,
    loadHistory,
    loadMoreHistory,
    syncHistoryFilterLoad,
    resetObservedHistoryKey,
    isHistoryRefreshInFlight,
  };
}
