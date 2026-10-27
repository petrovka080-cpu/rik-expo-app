import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useFocusEffect } from "expo-router";

import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";
import {
  ACCOUNTANT_FOCUS_REFRESH_MIN_INTERVAL_MS,
} from "./accountant.repository";
import { createAccountantRefreshHandlers, createAccountantTabPreviewHandler } from "./accountant.actions";
import {
  hasCurrentAccountantSessionUser,
  subscribeAccountantAuthStateChange,
} from "./accountant.screen.auth.transport";
import { useAccountantHistoryController } from "./useAccountantHistoryController";
import { useAccountantInboxController } from "./useAccountantInboxController";
import type { Tab } from "./types";

const errorMessage = (error: unknown) => {
  const value = error as { message?: string };
  return value?.message ?? String(error);
};

export function useAccountantScreenController(params: {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  tabHistory: Tab;
  freezeWhileOpen: boolean;
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (value: string) => string | null;
}) {
  const { tab, setTab, tabHistory, freezeWhileOpen, dateFrom, dateTo, histSearch, toRpcDateOrNull } = params;

  const tabRef = useRef<Tab>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const [authReady, setAuthReady] = useState(false);

  const focusedRef = useRef(false);
  const lastFocusRefreshAtRef = useRef(0);
  const lastHandledFocusEpochRef = useRef(0);
  const lastTabLoadRef = useRef<Tab | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(0);

  useEffect(() => {
    let alive = true;

    const syncAuth = async () => {
      try {
        const hasSessionUser = await hasCurrentAccountantSessionUser();
        if (!alive) return;
        setAuthReady(hasSessionUser);
      } catch (error) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "screen_root",
          category: "ui",
          event: "sync_auth",
          result: "error",
          errorClass: error instanceof Error ? error.name : undefined,
          errorMessage: errorMessage(error),
          extra: { mode: "degraded" },
        });
        if (!alive) return;
        setAuthReady(false);
      }
    };

    void syncAuth();

    const { data: listener } = subscribeAccountantAuthStateChange({
      onChange: (_event, session) => {
        if (!alive) return;
        setAuthReady(Boolean(session?.user));
      },
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const inboxController = useAccountantInboxController({
    authReady,
    freezeWhileOpen,
    focusedRef,
    tabRef,
  });
  const historyController = useAccountantHistoryController({
    authReady,
    freezeWhileOpen,
    focusedRef,
    tabRef,
    tabHistory,
    dateFrom,
    dateTo,
    histSearch,
    toRpcDateOrNull,
  });
  const {
    rows,
    setRows,
    loading,
    refreshing,
    setRefreshing,
    loadingMore: inboxLoadingMore,
    hasMore: inboxHasMore,
    totalCount: inboxTotalCount,
    cacheByTabRef,
    loadInbox,
    loadMoreInbox,
    primeInboxPreviewForTab,
    isInboxRefreshInFlight,
  } = inboxController;
  const {
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
  } = historyController;

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setFocusEpoch((value) => value + 1);

      return () => {
        focusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    syncHistoryFilterLoad();
  }, [syncHistoryFilterLoad]);

  useEffect(() => {
    if (!focusedRef.current) return;

    const surface = tabRef.current === tabHistory ? "history_list" : "inbox_list";
    const event = tabRef.current === tabHistory ? "load_history" : "load_inbox";
    if (!authReady) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "accountant",
        surface,
        event,
        trigger: "focus",
        extra: { tab: tabRef.current },
      });
      return;
    }
    if (freezeWhileOpen) return;

    const isNewFocus = lastHandledFocusEpochRef.current !== focusEpoch;
    if (isNewFocus) {
      const now = Date.now();
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastFocusRefreshAtRef.current,
          minIntervalMs: ACCOUNTANT_FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "accountant",
          surface,
          event,
          trigger: "focus",
          extra: { tab: tabRef.current },
        });
        return;
      }
      lastFocusRefreshAtRef.current = now;
      lastHandledFocusEpochRef.current = focusEpoch;
    }

    lastTabLoadRef.current = tabRef.current;
    if (tabRef.current !== tabHistory) {
      primeInboxPreviewForTab(tabRef.current);
    }
    if (tabRef.current === tabHistory) {
      void loadHistory(true, "focus");
      return;
    }
    void loadInbox(true, tabRef.current, "focus");
  }, [authReady, focusEpoch, freezeWhileOpen, loadHistory, loadInbox, primeInboxPreviewForTab, tabHistory]);

  useEffect(() => {
    if (!authReady) return;
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    if (lastTabLoadRef.current === tab) return;
    lastTabLoadRef.current = tab;

    if (tab === tabHistory) {
      resetObservedHistoryKey();
      void loadHistory(true);
      return;
    }
    void loadInbox(true, tab);
  }, [authReady, freezeWhileOpen, loadHistory, loadInbox, resetObservedHistoryKey, tab, tabHistory]);

  const { onRefresh, onRefreshHistory, refreshCurrentVisibleScope } = createAccountantRefreshHandlers({
    loadInbox,
    loadHistory,
    setRefreshing,
    setHistoryRefreshing,
    tabRef,
    historyTab: tabHistory,
  });

  const isRealtimeRefreshInFlight = useCallback(
    () => isInboxRefreshInFlight() || isHistoryRefreshInFlight(),
    [isHistoryRefreshInFlight, isInboxRefreshInFlight],
  );

  const setTabWithCachePreview = createAccountantTabPreviewHandler({
    historyTab: tabHistory,
    tabRef,
    setTab,
    primeInboxPreviewForTab,
  });

  return {
    tabRef,
    focusedRef,
    rows,
    setRows,
    loading,
    refreshing,
    inboxLoadingMore,
    inboxHasMore,
    inboxTotalCount,
    historyRows,
    historyLoading,
    historyRefreshing,
    historyLoadingMore,
    historyHasMore,
    historyTotalCount,
    historyTotalAmount,
    historyCurrency,
    cacheByTabRef,
    load: loadInbox,
    loadMoreInbox,
    loadHistory,
    loadMoreHistory,
    onRefresh,
    onRefreshHistory,
    refreshCurrentVisibleScope,
    isRealtimeRefreshInFlight,
    setTabWithCachePreview,
  };
}
