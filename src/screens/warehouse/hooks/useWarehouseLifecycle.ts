import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import { useAppActiveRevalidation } from "../../../lib/lifecycle/useAppActiveRevalidation";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_STOCK_FACT = WAREHOUSE_TABS[1];
const TAB_EXPENSE = WAREHOUSE_TABS[2];
const TAB_REPORTS = WAREHOUSE_TABS[3];
const WAREHOUSE_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

export function useWarehouseLifecycle(params: {
  tab: Tab;
  isScreenFocused: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const {
    tab,
    isScreenFocused,
    setLoading,
    fetchToReceive,
    fetchStock,
    fetchReports,
    screenActiveRef: externalScreenActiveRef,
    onError,
  } = params;

  const screenActiveRef = useWarehouseFallbackActiveRef(
    externalScreenActiveRef,
  );
  const focusedRef = useRef(isScreenFocused);
  const didInitLoadRef = useRef(false);
  const lifecycleRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  useEffect(() => {
    focusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  const isScreenActive = useCallback(
    () => isWarehouseScreenActive(screenActiveRef) && focusedRef.current,
    [screenActiveRef],
  );

  const loadAll = useCallback(async () => {
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "warehouse",
        surface: "screen_root",
        event: "bootstrap_load",
        trigger: "initial",
        extra: {
          networkKnownOffline: true,
        },
      });
      return;
    }
    if (!isScreenActive()) return;
    setLoading(true);
    try {
      const [incomingRes, stockRes] = await Promise.allSettled([
        fetchToReceive(),
        fetchStock(),
      ]);
      if (!isScreenActive()) return;
      if (incomingRes.status === "rejected") throw incomingRes.reason;
      if (stockRes.status === "rejected") throw stockRes.reason;
    } catch (e) {
      if (!isScreenActive()) return;
      onError(e);
    } finally {
      if (!isScreenActive()) return;
      setLoading(false);
    }
  }, [fetchStock, fetchToReceive, isScreenActive, onError, setLoading]);

  useEffect(() => {
    if (didInitLoadRef.current) return;
    didInitLoadRef.current = true;
    // Prevent an immediate focus-refresh from duplicating the initial bootstrap fetches.
    lastFocusRefreshAtRef.current = Date.now();
    let cancelled = false;
    void loadAll().finally(() => {
      if (cancelled || !isScreenActive()) return;
      lastFocusRefreshAtRef.current = Date.now();
    });
    return () => {
      cancelled = true;
    };
  }, [isScreenActive, loadAll]);

  const refreshActiveTab = useCallback(async () => {
    if (tab === TAB_INCOMING) {
      await fetchToReceive();
      return;
    }
    if (tab === TAB_STOCK_FACT) {
      await fetchStock();
      return;
    }
    if (tab === TAB_REPORTS) {
      await fetchReports();
    }
  }, [tab, fetchToReceive, fetchStock, fetchReports]);

  const startLifecycleRefresh = useCallback(() => {
    const task = refreshActiveTab()
      .catch((error) => {
        if (!isScreenActive()) return;
        onError(error);
      })
      .finally(() => {
        if (lifecycleRefreshInFlightRef.current === task) {
          lifecycleRefreshInFlightRef.current = null;
        }
      });
    lifecycleRefreshInFlightRef.current = task;
    return task;
  }, [isScreenActive, onError, refreshActiveTab]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "warehouse",
          surface: "screen_root",
          event: "focus_refresh",
          trigger: "focus",
          extra: {
            tab,
            networkKnownOffline: true,
          },
        });
        return undefined;
      }
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastFocusRefreshAtRef.current,
          minIntervalMs: WAREHOUSE_FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "warehouse",
          surface: "screen_root",
          event: "focus_refresh",
          trigger: "focus",
          extra: { tab },
        });
        return undefined;
      }
      if (lifecycleRefreshInFlightRef.current) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "warehouse",
          surface: "screen_root",
          event: "focus_refresh",
          trigger: "focus",
          extra: { tab, joinedInFlight: true },
        });
        return undefined;
      }

      void startLifecycleRefresh();
      lastFocusRefreshAtRef.current = now;
      return undefined;
    }, [startLifecycleRefresh, tab]),
  );

  useAppActiveRevalidation({
    screen: "warehouse",
    surface: "screen_root",
    enabled:
      isScreenFocused &&
      isWarehouseScreenActive(screenActiveRef) &&
      tab !== TAB_EXPENSE,
    onRevalidate: async () => {
      if (!isScreenActive()) return;
      await startLifecycleRefresh();
    },
    isInFlight: () => lifecycleRefreshInFlightRef.current !== null,
  });
}
