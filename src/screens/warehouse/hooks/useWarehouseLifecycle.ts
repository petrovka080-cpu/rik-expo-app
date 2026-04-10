import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";
import { useWarehouseUnmountSafety } from "./useWarehouseUnmountSafety";

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_STOCK_FACT = WAREHOUSE_TABS[1];
const TAB_REPORTS = WAREHOUSE_TABS[3];
const WAREHOUSE_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

export function useWarehouseLifecycle(params: {
  tab: Tab;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const {
    tab,
    setLoading,
    fetchToReceive,
    fetchStock,
    fetchReports,
    onError,
  } = params;

  const didInitLoadRef = useRef(false);
  const focusRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastFocusRefreshAtRef = useRef(0);
  const unmountSafety = useWarehouseUnmountSafety("warehouse_lifecycle");

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
    unmountSafety.guardStateUpdate(
      () => {
        setLoading(true);
      },
      {
        resource: "load_all_loading_start",
        reason: "initial_bootstrap",
      },
    );
    try {
      const [incomingRes, stockRes] = await Promise.allSettled([fetchToReceive(), fetchStock()]);
      if (
        !unmountSafety.shouldHandleAsyncResult({
          resource: "load_all_settle",
          reason: "initial_bootstrap",
        })
      ) {
        return;
      }
      if (incomingRes.status === "rejected") throw incomingRes.reason;
      if (stockRes.status === "rejected") throw stockRes.reason;
    } catch (e) {
      onError(e);
    } finally {
      unmountSafety.guardStateUpdate(
        () => {
          setLoading(false);
        },
        {
          resource: "load_all_loading_finish",
          reason: "initial_bootstrap",
        },
      );
    }
  }, [setLoading, fetchToReceive, fetchStock, onError, unmountSafety]);

  useEffect(() => {
    if (didInitLoadRef.current) return;
    didInitLoadRef.current = true;
    // Prevent an immediate focus-refresh from duplicating the initial bootstrap fetches.
    lastFocusRefreshAtRef.current = Date.now();
    void loadAll().finally(() => {
      lastFocusRefreshAtRef.current = Date.now();
    });
  }, [loadAll]);

  useEffect(
    () => () => {
      unmountSafety.runInteractionCleanup(() => {
        focusRefreshInFlightRef.current = null;
      }, {
        resource: "focus_refresh_inflight_ref",
        reason: "warehouse_route_unmount",
      });
    },
    [unmountSafety],
  );

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
      if (focusRefreshInFlightRef.current) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "warehouse",
          surface: "screen_root",
          event: "focus_refresh",
          trigger: "focus",
          extra: { tab, joinedInFlight: true },
        });
        return undefined;
      }

      const task = refreshActiveTab()
        .catch((e) => {
          if (
            unmountSafety.shouldHandleAsyncResult({
              resource: "focus_refresh_error",
              reason: String(tab),
            })
          ) {
            onError(e);
          }
        })
        .finally(() => {
          if (focusRefreshInFlightRef.current === task) {
            focusRefreshInFlightRef.current = null;
          }
        });
      focusRefreshInFlightRef.current = task;
      lastFocusRefreshAtRef.current = now;
      return undefined;
    }, [refreshActiveTab, onError, tab, unmountSafety]),
  );
}
