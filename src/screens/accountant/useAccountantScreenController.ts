import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { rowsShallowEqual, runNextTick } from "./helpers";
import type { AccountantInboxUiRow, HistoryRow, Tab } from "./types";
import {
  loadAccountantHistoryWindowData,
  type AccountantHistoryWindowLoadResult,
} from "./accountant.history.service";
import {
  loadAccountantInboxWindowData,
  type AccountantInboxWindowLoadResult,
} from "./accountant.inbox.service";
import { beginPlatformObservability, recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";

const errorMessage = (e: unknown) => {
  const x = e as { message?: string };
  return x?.message ?? String(e);
};

const buildHistoryKey = (dateFrom: string, dateTo: string, histSearch: string) =>
  `from=${String(dateFrom || "")}|to=${String(dateTo || "")}|q=${String(histSearch || "")}`;

const ACCOUNTANT_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;
const ACCOUNTANT_INBOX_PAGE_SIZE = 40;
const ACCOUNTANT_HISTORY_PAGE_SIZE = 50;

type InboxWindowSnapshot = {
  rows: AccountantInboxUiRow[];
  nextOffsetRows: number;
  hasMore: boolean;
  totalRowCount: number;
  limitRows: number;
};

type HistoryWindowSnapshot = {
  key: string;
  rows: HistoryRow[];
  nextOffsetRows: number;
  hasMore: boolean;
  totalRowCount: number;
  totalAmount: number;
  limitRows: number;
  currency: string;
};

const appendInboxRows = (prev: AccountantInboxUiRow[], next: AccountantInboxUiRow[]) => {
  if (!next.length) return prev;
  const existing = new Set(prev.map((row) => String(row.proposal_id ?? "").trim()));
  const toAppend = next.filter((row) => !existing.has(String(row.proposal_id ?? "").trim()));
  return toAppend.length ? [...prev, ...toAppend] : prev;
};

const appendHistoryRows = (prev: HistoryRow[], next: HistoryRow[]) => {
  if (!next.length) return prev;
  const existing = new Set(prev.map((row) => Number(row.payment_id)));
  const toAppend = next.filter((row) => !existing.has(Number(row.payment_id)));
  return toAppend.length ? [...prev, ...toAppend] : prev;
};

export function useAccountantScreenController(params: {
  tab: Tab;
  setTab: React.Dispatch<React.SetStateAction<Tab>>;
  tabHistory: Tab;
  freezeWhileOpen: boolean;
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (v: string) => string | null;
}) {
  const { tab, setTab, tabHistory, freezeWhileOpen, dateFrom, dateTo, histSearch, toRpcDateOrNull } = params;

  const tabRef = useRef<Tab>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const [rows, setRows] = useState<AccountantInboxUiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inboxLoadingMore, setInboxLoadingMore] = useState(false);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [inboxTotalCount, setInboxTotalCount] = useState(0);

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyTotalAmount, setHistoryTotalAmount] = useState(0);
  const [historyCurrency, setHistoryCurrency] = useState("KGS");

  const [authReady, setAuthReady] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  const focusedRef = useRef(false);
  const lastFocusRefreshAtRef = useRef(0);
  const lastTabLoadRef = useRef<Tab | null>(null);
  const loadSeqRef = useRef(0);
  const inflightKeyRef = useRef<string | null>(null);
  const inboxAppendInflightKeyRef = useRef<string | null>(null);
  const queuedLoadRef = useRef<{ force: boolean; tab: Tab } | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const cacheByTabRef = useRef<Record<string, InboxWindowSnapshot>>({});
  const triedRpcOkRef = useRef<boolean>(true);

  const historySeqRef = useRef(0);
  const historyInflightKeyRef = useRef<string | null>(null);
  const historyAppendInflightKeyRef = useRef<string | null>(null);
  const historyQueuedRef = useRef<{ force: boolean; key: string } | null>(null);
  const lastLoadedHistKeyRef = useRef<string>("");
  const observedHistKeyRef = useRef<string>("");
  const historySnapshotRef = useRef<HistoryWindowSnapshot | null>(null);

  useEffect(() => {
    let alive = true;

    const syncAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setAuthReady(Boolean(data?.session?.user));
        setAuthResolved(true);
      } catch {
        if (!alive) return;
        setAuthReady(false);
        setAuthResolved(true);
      }
    };

    void syncAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setAuthReady(Boolean(session?.user));
      setAuthResolved(true);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const applyInboxSnapshot = useCallback(
    (tabKey: Tab, result: AccountantInboxWindowLoadResult, append: boolean) => {
      const previous = cacheByTabRef.current[tabKey];
      const mergedRows = append && previous ? appendInboxRows(previous.rows, result.rows) : result.rows;
      const snapshot: InboxWindowSnapshot = {
        rows: mergedRows,
        nextOffsetRows: result.meta.offsetRows + result.meta.returnedRowCount,
        hasMore: result.meta.hasMore,
        totalRowCount: result.meta.totalRowCount,
        limitRows: result.meta.limitRows,
      };
      cacheByTabRef.current[tabKey] = snapshot;
      setInboxHasMore(snapshot.hasMore);
      setInboxTotalCount(snapshot.totalRowCount);
      setRows((prev) => {
        if (!append) return rowsShallowEqual(prev, snapshot.rows) ? prev : snapshot.rows;
        return snapshot.rows;
      });
      return snapshot;
    },
    [],
  );

  const applyHistorySnapshot = useCallback(
    (key: string, result: AccountantHistoryWindowLoadResult, append: boolean) => {
      const previous = historySnapshotRef.current?.key === key ? historySnapshotRef.current : null;
      const mergedRows = append && previous ? appendHistoryRows(previous.rows, result.rows) : result.rows;
      const currency = mergedRows[0]?.invoice_currency ?? previous?.currency ?? "KGS";
      const snapshot: HistoryWindowSnapshot = {
        key,
        rows: mergedRows,
        nextOffsetRows: result.meta.offsetRows + result.meta.returnedRowCount,
        hasMore: result.meta.hasMore,
        totalRowCount: result.meta.totalRowCount,
        totalAmount: result.meta.totalAmount,
        limitRows: result.meta.limitRows,
        currency,
      };
      historySnapshotRef.current = snapshot;
      setHistoryHasMore(snapshot.hasMore);
      setHistoryTotalCount(snapshot.totalRowCount);
      setHistoryTotalAmount(snapshot.totalAmount);
      setHistoryCurrency(snapshot.currency);
      setHistoryRows(snapshot.rows);
      return snapshot;
    },
    [],
  );

  const loadHistory = useCallback(
    async (force?: boolean, trigger: HistoryLoadTrigger = force ? "manual" : "focus") => {
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
            key: buildHistoryKey(dateFrom, dateTo, histSearch),
            networkKnownOffline: true,
          },
        });
        return;
      }

      const key = buildHistoryKey(dateFrom, dateTo, histSearch);
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

      const cached = historySnapshotRef.current?.key === key ? historySnapshotRef.current : null;
      if (cached) {
        setHistoryRows(cached.rows);
        setHistoryHasMore(cached.hasMore);
        setHistoryTotalCount(cached.totalRowCount);
        setHistoryTotalAmount(cached.totalAmount);
        setHistoryCurrency(cached.currency);
      } else {
        setHistoryRows((prev) => (prev.length ? [] : prev));
        setHistoryHasMore(false);
        setHistoryTotalCount(0);
        setHistoryTotalAmount(0);
        setHistoryCurrency("KGS");
      }

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
        const result = await loadAccountantHistoryWindowData({
          dateFrom,
          dateTo,
          histSearch,
          offsetRows: 0,
          limitRows: ACCOUNTANT_HISTORY_PAGE_SIZE,
          toRpcDateOrNull,
        });
        if (seq !== historySeqRef.current) return;
        if (!focusedRef.current || tabRef.current !== tabHistory) return;
        const snapshot = applyHistorySnapshot(key, result, false);
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
      } catch (e: unknown) {
        console.error("[history load]", errorMessage(e));
        observation.error(e, {
          rowCount: 0,
          errorStage: "load_history_scope_v1",
        });
        if (seq === historySeqRef.current && focusedRef.current && tabRef.current === tabHistory) {
          historySnapshotRef.current = null;
          setHistoryRows([]);
          setHistoryHasMore(false);
          setHistoryTotalCount(0);
          setHistoryTotalAmount(0);
          setHistoryCurrency("KGS");
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
    [applyHistorySnapshot, authReady, dateFrom, dateTo, freezeWhileOpen, histSearch, tabHistory, toRpcDateOrNull],
  );

  const loadMoreHistory = useCallback(async () => {
    const key = buildHistoryKey(dateFrom, dateTo, histSearch);
    const current = historySnapshotRef.current?.key === key ? historySnapshotRef.current : null;
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
      const result = await loadAccountantHistoryWindowData({
        dateFrom,
        dateTo,
        histSearch,
        offsetRows: current.nextOffsetRows,
        limitRows: current.limitRows,
        toRpcDateOrNull,
      });
      if (!focusedRef.current || tabRef.current !== tabHistory) return;
      const snapshot = applyHistorySnapshot(key, result, true);
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
    } catch (e: unknown) {
      console.error("[history load more]", errorMessage(e));
      observation.error(e, {
        rowCount: 0,
        errorStage: "load_history_scope_v1_page",
      });
    } finally {
      historyAppendInflightKeyRef.current = null;
      setHistoryLoadingMore(false);
    }
  }, [applyHistorySnapshot, authReady, dateFrom, dateTo, freezeWhileOpen, histSearch, tabHistory, toRpcDateOrNull]);

  useEffect(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;
    if (tabRef.current !== tabHistory) return;

    const key = buildHistoryKey(dateFrom, dateTo, histSearch);
    if (observedHistKeyRef.current === key) return;
    observedHistKeyRef.current = key;
    void loadHistory(true);
  }, [dateFrom, dateTo, freezeWhileOpen, histSearch, loadHistory, tabHistory]);

  const onRefreshHistory = useCallback(async () => {
    setHistoryRefreshing(true);
    try {
      await loadHistory(true, "manual");
    } finally {
      setHistoryRefreshing(false);
    }
  }, [loadHistory]);

  const load = useCallback(
    async (force?: boolean, tabOverride?: Tab, trigger: InboxLoadTrigger = force ? "manual" : "focus") => {
      const t = (tabOverride ?? tabRef.current) as Tab;
      if (!authReady) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab: t },
        });
        return;
      }
      if (!focusedRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab: t },
        });
        return;
      }
      if (freezeWhileOpen) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab: t },
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
          extra: { tab: t, networkKnownOffline: true },
        });
        return;
      }

      const key = `tab:${t}`;
      const cached = cacheByTabRef.current[t];
      if (cached) {
        setRows((prev) => (rowsShallowEqual(prev, cached.rows) ? prev : cached.rows));
        setInboxHasMore(cached.hasMore);
        setInboxTotalCount(cached.totalRowCount);
      } else {
        setRows((prev) => (prev.length ? [] : prev));
        setInboxHasMore(false);
        setInboxTotalCount(0);
      }

      if (inflightKeyRef.current || inboxAppendInflightKeyRef.current) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "inbox_list",
          category: "reload",
          event: "load_inbox",
          result: "queued_rerun",
          trigger,
          extra: { tab: t },
        });
        queuedLoadRef.current = {
          force: Boolean(force) || queuedLoadRef.current?.force === true,
          tab: t,
        };
        return;
      }
      if (!force && lastLoadedKeyRef.current === key) return;

      inflightKeyRef.current = key;
      setLoading(!(cached && cached.rows.length > 0));
      const seq = ++loadSeqRef.current;
      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "inbox_list",
        category: "fetch",
        event: "load_inbox",
        sourceKind: "rpc:accountant_inbox_scope_v1",
        trigger,
      });

      try {
        const result = await loadAccountantInboxWindowData({
          tab: t,
          triedRpcOk: triedRpcOkRef.current,
          offsetRows: 0,
          limitRows: ACCOUNTANT_INBOX_PAGE_SIZE,
        });
        triedRpcOkRef.current = result.nextTriedRpcOk;
        if (seq !== loadSeqRef.current) return;
        if (t !== tabRef.current) return;

        const snapshot = applyInboxSnapshot(t, result, false);
        recordPlatformObservability({
          screen: "accountant",
          surface: "inbox_list",
          category: "ui",
          event: "content_ready",
          result: "success",
          rowCount: snapshot.rows.length,
          extra: {
            tab: t,
            totalRowCount: snapshot.totalRowCount,
          },
        });
        observation.success({
          rowCount: snapshot.rows.length,
          sourceKind: result.sourceMeta.sourceKind,
          fallbackUsed: result.sourceMeta.fallbackUsed,
          extra: {
            tab: t,
            primaryOwner: result.sourceMeta.primaryOwner,
            backendFirstPrimary: result.sourceMeta.backendFirstPrimary,
            offsetRows: result.meta.offsetRows,
            limitRows: result.meta.limitRows,
            returnedRowCount: result.meta.returnedRowCount,
            totalRowCount: result.meta.totalRowCount,
            hasMore: result.meta.hasMore,
          },
        });
        lastLoadedKeyRef.current = key;
      } catch (e: unknown) {
        console.error("[accountant load]", errorMessage(e));
        observation.error(e, {
          rowCount: 0,
          errorStage: "load_inbox_scope_v1",
          extra: { tab: t },
        });
      } finally {
        if (seq === loadSeqRef.current && t === tabRef.current) setLoading(false);
        inflightKeyRef.current = null;
        const queued = queuedLoadRef.current;
        queuedLoadRef.current = null;
        if (
          queued &&
          focusedRef.current &&
          !freezeWhileOpen &&
          (queued.force || `tab:${queued.tab}` !== lastLoadedKeyRef.current)
        ) {
          runNextTick(() => {
            void load(queued.force, queued.tab);
          });
        }
      }
    },
    [applyInboxSnapshot, authReady, freezeWhileOpen],
  );

  const loadMoreInbox = useCallback(async () => {
    const t = tabRef.current;
    const current = cacheByTabRef.current[t];
    if (!authReady) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab: t },
      });
      return;
    }
    if (!focusedRef.current || freezeWhileOpen) return;
    if (!current?.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab: t },
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
        extra: { tab: t, networkKnownOffline: true },
      });
      return;
    }
    if (inflightKeyRef.current || inboxAppendInflightKeyRef.current) {
      recordPlatformObservability({
        screen: "accountant",
        surface: "inbox_list",
        category: "reload",
        event: "load_inbox_page",
        result: "joined_inflight",
        trigger: "scroll",
        extra: { tab: t },
      });
      return;
    }

    inboxAppendInflightKeyRef.current = `${t}:${current.nextOffsetRows}`;
    setInboxLoadingMore(true);
    const observation = beginPlatformObservability({
      screen: "accountant",
      surface: "inbox_list",
      category: "fetch",
      event: "load_inbox_page",
      sourceKind: "rpc:accountant_inbox_scope_v1",
      trigger: "scroll",
    });
    try {
      const result = await loadAccountantInboxWindowData({
        tab: t,
        triedRpcOk: triedRpcOkRef.current,
        offsetRows: current.nextOffsetRows,
        limitRows: current.limitRows,
      });
      triedRpcOkRef.current = result.nextTriedRpcOk;
      if (!focusedRef.current || tabRef.current !== t) return;
      const snapshot = applyInboxSnapshot(t, result, true);
      observation.success({
        rowCount: result.rows.length,
        sourceKind: result.sourceMeta.sourceKind,
        fallbackUsed: result.sourceMeta.fallbackUsed,
        extra: {
          tab: t,
          primaryOwner: result.sourceMeta.primaryOwner,
          offsetRows: result.meta.offsetRows,
          limitRows: result.meta.limitRows,
          returnedRowCount: result.meta.returnedRowCount,
          totalRowCount: result.meta.totalRowCount,
          hasMore: result.meta.hasMore,
          mergedRowCount: snapshot.rows.length,
        },
      });
    } catch (e: unknown) {
      console.error("[accountant load more]", errorMessage(e));
      observation.error(e, {
        rowCount: 0,
        errorStage: "load_inbox_scope_v1_page",
        extra: { tab: t },
      });
    } finally {
      inboxAppendInflightKeyRef.current = null;
      setInboxLoadingMore(false);
    }
  }, [applyInboxSnapshot, authReady, freezeWhileOpen]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      lastTabLoadRef.current = tabRef.current;
      const now = Date.now();
      if (!authReady) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "accountant",
          surface: tabRef.current === tabHistory ? "history_list" : "inbox_list",
          event: tabRef.current === tabHistory ? "load_history" : "load_inbox",
          trigger: "focus",
          extra: { tab: tabRef.current },
        });
        return () => {
          focusedRef.current = false;
        };
      }
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastFocusRefreshAtRef.current,
          minIntervalMs: ACCOUNTANT_FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "accountant",
          surface: tabRef.current === tabHistory ? "history_list" : "inbox_list",
          event: tabRef.current === tabHistory ? "load_history" : "load_inbox",
          trigger: "focus",
          extra: { tab: tabRef.current },
        });
        return () => {
          focusedRef.current = false;
        };
      }
      lastFocusRefreshAtRef.current = now;
      if (tabRef.current !== tabHistory) {
        const cached = cacheByTabRef.current[tabRef.current];
        if (cached) {
          setRows((prev) => (rowsShallowEqual(prev, cached.rows) ? prev : cached.rows));
          setInboxHasMore(cached.hasMore);
          setInboxTotalCount(cached.totalRowCount);
        }
      }
      if (tabRef.current === tabHistory) {
      void loadHistory(true, "focus");
    } else {
      void load(true, tabRef.current, "focus");
    }

      return () => {
        focusedRef.current = false;
      };
    }, [authReady, load, loadHistory, tabHistory]),
  );

  useEffect(() => {
    if (!authReady) return;
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    if (lastTabLoadRef.current === tab) return;
    lastTabLoadRef.current = tab;

    if (tab === tabHistory) {
      observedHistKeyRef.current = "";
      runNextTick(() => {
        void loadHistory(true);
      });
    } else {
      runNextTick(() => {
        void load(true, tab);
      });
    }
  }, [authReady, freezeWhileOpen, load, loadHistory, tab, tabHistory]);

  useEffect(() => {
    if (!authResolved || !authReady) return;
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    if (tabRef.current === tabHistory) {
      observedHistKeyRef.current = "";
        void loadHistory(true, "focus");
      return;
    }
    void load(true, tabRef.current, "focus");
  }, [authReady, authResolved, freezeWhileOpen, load, loadHistory, tabHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true, undefined, "manual");
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const refreshCurrentVisibleScope = useCallback(async () => {
    if (tabRef.current === tabHistory) {
      await loadHistory(true, "realtime");
      return;
    }
    await load(true, tabRef.current, "realtime");
  }, [load, loadHistory, tabHistory]);

  const isRealtimeRefreshInFlight = useCallback(
    () =>
      Boolean(
        inflightKeyRef.current ||
        inboxAppendInflightKeyRef.current ||
        historyInflightKeyRef.current ||
        historyAppendInflightKeyRef.current,
      ),
    [],
  );

  const setTabWithCachePreview = useCallback(
    (nextTab: Tab) => {
      if (nextTab === tabRef.current) return;
      if (nextTab !== tabHistory) {
        const cached = cacheByTabRef.current[nextTab];
        if (cached) {
          setRows(cached.rows);
          setInboxHasMore(cached.hasMore);
          setInboxTotalCount(cached.totalRowCount);
        } else {
          setRows([]);
          setInboxHasMore(false);
          setInboxTotalCount(0);
        }
      }
      setTab(nextTab);
    },
    [setTab, tabHistory],
  );

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
    load,
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
  type InboxLoadTrigger = "focus" | "manual" | "realtime";
  type HistoryLoadTrigger = "focus" | "manual" | "realtime";
