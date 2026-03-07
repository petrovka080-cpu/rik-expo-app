import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import type { Tab } from "../warehouse.types";

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
    if (tab === "К приходу") {
      await fetchToReceive();
      return;
    }
    if (tab === "Склад факт") {
      await fetchStock();
      return;
    }
    if (tab === "Расход") {
      await fetchReqHeadsForce();
      return;
    }
    if (tab === "Отчёты") {
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
