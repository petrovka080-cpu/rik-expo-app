import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_STOCK_FACT = WAREHOUSE_TABS[1];
const TAB_EXPENSE = WAREHOUSE_TABS[2];
const TAB_REPORTS = WAREHOUSE_TABS[3];

export function useWarehouseLifecycle(params: {
  tab: Tab;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReqHeadsForce: () => Promise<void>;
  fetchReports: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const {
    tab,
    setLoading,
    fetchToReceive,
    fetchStock,
    fetchReqHeadsForce,
    fetchReports,
    onError,
  } = params;

  const didInitLoadRef = useRef(false);
  const focusRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchToReceive();
      await fetchStock();
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [setLoading, fetchToReceive, fetchStock, onError]);

  useEffect(() => {
    if (didInitLoadRef.current) return;
    didInitLoadRef.current = true;
    void loadAll().finally(() => {
      lastFocusRefreshAtRef.current = Date.now();
    });
  }, [loadAll]);

  const refreshActiveTab = useCallback(async () => {
    if (tab === TAB_INCOMING) {
      await fetchToReceive();
      return;
    }
    if (tab === TAB_STOCK_FACT) {
      await fetchStock();
      return;
    }
    if (tab === TAB_EXPENSE) {
      await fetchReqHeadsForce();
      return;
    }
    if (tab === TAB_REPORTS) {
      await fetchReports();
    }
  }, [tab, fetchToReceive, fetchStock, fetchReqHeadsForce, fetchReports]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 1200) return undefined;
      if (focusRefreshInFlightRef.current) return undefined;

      const task = refreshActiveTab()
        .catch((e) => onError(e))
        .finally(() => {
          if (focusRefreshInFlightRef.current === task) {
            focusRefreshInFlightRef.current = null;
          }
        });
      focusRefreshInFlightRef.current = task;
      lastFocusRefreshAtRef.current = now;
      return undefined;
    }, [refreshActiveTab, onError]),
  );
}
