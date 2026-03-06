import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { filterRowsByTab, sortRowsByTab } from "./accountant.tabFilter";
import { rowsShallowEqual, runNextTick } from "./helpers";
import type { AccountantInboxUiRow, HistoryRow, Tab } from "./types";
import { loadAccountantHistoryRows } from "./accountant.history.service";
import { loadAccountantInboxViaRpc, mapAccountantFallbackPropsToInboxRows } from "./accountant.inbox.service";

const HISTORY_FILTER_DEBOUNCE_MS = 200;

const errorMessage = (e: unknown) => {
  const x = e as { message?: string };
  return x?.message ?? String(e);
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
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  const focusedRef = useRef(false);
  const lastTabLoadRef = useRef<Tab | null>(null);
  const lastKickListRef = useRef(0);
  const lastKickHistRef = useRef(0);
  const loadSeqRef = useRef(0);
  const inflightKeyRef = useRef<string | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const cacheByTabRef = useRef<Record<string, AccountantInboxUiRow[]>>({});
  const triedRpcOkRef = useRef<boolean>(true);
  const lastHistKeyRef = useRef<string>("");

  const loadHistory = useCallback(
    async (force?: boolean) => {
      if (!focusedRef.current) return;

      const now = Date.now();
      if (!force && now - lastKickHistRef.current < 900) return;
      lastKickHistRef.current = now;

      setHistoryLoading(true);
      try {
        const arr = await loadAccountantHistoryRows({
          dateFrom,
          dateTo,
          histSearch,
          toRpcDateOrNull,
        });
        setHistoryRows(arr);
      } catch (e: unknown) {
        console.error("[history load]", errorMessage(e));
        setHistoryRows([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [dateFrom, dateTo, histSearch, toRpcDateOrNull],
  );

  useEffect(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;
    if (tabRef.current !== tabHistory) return;

    const key = `from=${String(dateFrom || "")}|to=${String(dateTo || "")}|q=${String(histSearch || "")}`;
    if (lastHistKeyRef.current === key) return;
    lastHistKeyRef.current = key;

    // Preserve existing debounce for history filters to avoid frequent reload spikes.
    const t = setTimeout(() => {
      void loadHistory(true);
    }, HISTORY_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo, histSearch, freezeWhileOpen, loadHistory, tabHistory]);

  const onRefreshHistory = useCallback(async () => {
    setHistoryRefreshing(true);
    try {
      await loadHistory();
    } finally {
      setHistoryRefreshing(false);
    }
  }, [loadHistory]);

  const load = useCallback(
    async (force?: boolean, tabOverride?: Tab) => {
      const t = (tabOverride ?? tabRef.current) as Tab;
      if (!focusedRef.current) return;
      if (freezeWhileOpen) return;

      const key = `tab:${t}`;
      const now = Date.now();
      const cached = cacheByTabRef.current[t];
      if (Array.isArray(cached)) {
        setRows((prev) => (rowsShallowEqual(prev, cached) ? prev : cached));
      } else {
        setRows((prev) => (prev.length ? [] : prev));
      }

      if (!force && inflightKeyRef.current === key) return;
      if (!force && lastLoadedKeyRef.current === key && now - lastKickListRef.current < 900) return;
      if (!force && now - lastKickListRef.current < 450) return;

      lastKickListRef.current = now;
      inflightKeyRef.current = key;
      setLoading(!(Array.isArray(cached) && cached.length > 0));
      const seq = ++loadSeqRef.current;

      try {
        let data: AccountantInboxUiRow[] = [];
        const rpc = await loadAccountantInboxViaRpc({ tab: t, triedRpcOk: triedRpcOkRef.current });
        let rpcFailed = rpc.rpcFailed;
        triedRpcOkRef.current = rpc.nextTriedRpcOk;
        data = rpc.data;

        if (rpcFailed || !triedRpcOkRef.current) {
          const { data: props } = await supabase
            .from("proposals")
            .select("id, proposal_no, display_no, id_short, status, payment_status, invoice_number, invoice_date, invoice_amount, invoice_currency, supplier, sent_to_accountant_at")
            .not("sent_to_accountant_at", "is", null)
            .order("sent_to_accountant_at", { ascending: false, nullsFirst: false });
          data = await mapAccountantFallbackPropsToInboxRows(props);
        }

        const filtered = filterRowsByTab(data || [], t);
        const sorted = sortRowsByTab(filtered, t);
        if (seq !== loadSeqRef.current) return;
        if (t !== tabRef.current) return;

        cacheByTabRef.current[t] = sorted;
        setRows((prev) => (rowsShallowEqual(prev, sorted) ? prev : sorted));
        lastLoadedKeyRef.current = key;
      } catch (e: unknown) {
        console.error("[accountant load]", errorMessage(e));
      } finally {
        if (seq === loadSeqRef.current && t === tabRef.current) {
          setLoading(false);
        }
        inflightKeyRef.current = null;
      }
    },
    [freezeWhileOpen],
  );

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      lastTabLoadRef.current = tabRef.current;
      if (tabRef.current !== tabHistory) {
        const cached = cacheByTabRef.current[tabRef.current];
        if (Array.isArray(cached)) setRows(cached);
      }
      if (tabRef.current === tabHistory) {
        void loadHistory(true);
      } else {
        void load(true, tabRef.current);
      }

      return () => {
        focusedRef.current = false;
      };
    }, [load, loadHistory, tabHistory]),
  );

  useEffect(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    if (lastTabLoadRef.current === tab) return;
    lastTabLoadRef.current = tab;

    if (tab === tabHistory) {
      lastHistKeyRef.current = "";
      // Keep async ordering on history tab transitions without a magic timer delay.
      runNextTick(() => {
        void loadHistory(true);
      });
    } else {
      // Keep async ordering on inbox tab transitions without a magic timer delay.
      runNextTick(() => {
        void load(true, tab);
      });
    }
  }, [tab, tabHistory, freezeWhileOpen, load, loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const setTabWithCachePreview = useCallback(
    (nextTab: Tab) => {
      if (nextTab === tabRef.current) return;
      if (nextTab !== tabHistory) {
        const cached = cacheByTabRef.current[nextTab];
        setRows(Array.isArray(cached) ? cached : []);
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
    historyRows,
    historyLoading,
    historyRefreshing,
    cacheByTabRef,
    load,
    loadHistory,
    onRefresh,
    onRefreshHistory,
    setTabWithCachePreview,
  };
}


