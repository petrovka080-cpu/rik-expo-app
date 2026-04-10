import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";

const useMountedRef = () => {
  const ref = useRef(true);
  useEffect(() => () => { ref.current = false; }, []);
  return ref;
};

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_STOCK_FACT = WAREHOUSE_TABS[1];
const TAB_REPORTS = WAREHOUSE_TABS[3];
const WAREHOUSE_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

export function useWarehouseLifecycle(params: {
  tab: Tab;
  isScreenFocused: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const {
    tab,
    isScreenFocused,
    setLoading,
    fetchToReceive,
    fetchStock,
    fetchReports,
    onError,
  } = params;

  const mountedRef = useMountedRef();
  const focusedRef = useRef(isScreenFocused);
  const didInitLoadRef = useRef(false);
  const focusRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  useEffect(() => {
    focusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  const isScreenActive = useCallback(
    () => mountedRef.current && focusedRef.current,
    [mountedRef],
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
      const [incomingRes, stockRes] = await Promise.allSettled([fetchToReceive(), fetchStock()]);
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
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
          if (!active || !isScreenActive()) return;
          onError(e);
        })
        .finally(() => {
          if (focusRefreshInFlightRef.current === task) {
            focusRefreshInFlightRef.current = null;
          }
        });
      focusRefreshInFlightRef.current = task;
      lastFocusRefreshAtRef.current = now;
      return () => {
        active = false;
      };
    }, [isScreenActive, onError, refreshActiveTab, tab]),
  );
}
