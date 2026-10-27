import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { registerTimeout } from "../../lib/lifecycle/timerRegistry";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";
import { subscribeChannel } from "../../lib/realtime/realtime.client";
import {
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";
import { WAREHOUSE_TABS, type Tab } from "./warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./hooks/useWarehouseScreenActivity";

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_EXPENSE = WAREHOUSE_TABS[2];
const WAREHOUSE_REALTIME_GUARD_MS = 2000;

export function useWarehouseRealtimeLifecycle(params: {
  tab: Tab;
  refreshIncoming: () => Promise<void>;
  refreshExpense: () => Promise<void>;
  isIncomingRefreshInFlight: () => boolean;
  isExpenseRefreshInFlight: () => boolean;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const tabRef = useRef(params.tab);
  const refreshIncomingRef = useRef(params.refreshIncoming);
  const refreshExpenseRef = useRef(params.refreshExpense);
  const isIncomingRefreshInFlightRef = useRef(params.isIncomingRefreshInFlight);
  const isExpenseRefreshInFlightRef = useRef(params.isExpenseRefreshInFlight);
  const lastRealtimeAtByScopeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    tabRef.current = params.tab;
  }, [params.tab]);
  useEffect(() => {
    refreshIncomingRef.current = params.refreshIncoming;
  }, [params.refreshIncoming]);
  useEffect(() => {
    refreshExpenseRef.current = params.refreshExpense;
  }, [params.refreshExpense]);
  useEffect(() => {
    isIncomingRefreshInFlightRef.current = params.isIncomingRefreshInFlight;
  }, [params.isIncomingRefreshInFlight]);
  useEffect(() => {
    isExpenseRefreshInFlightRef.current = params.isExpenseRefreshInFlight;
  }, [params.isExpenseRefreshInFlight]);

  const bindRealtime = useCallback(() => {
    const detach = subscribeChannel({
      name: WAREHOUSE_REALTIME_CHANNEL_NAME,
      scope: "warehouse",
      route: "/office/warehouse",
      surface: "screen_root",
      bindings: WAREHOUSE_REALTIME_BINDINGS,
      onEvent: ({ binding, payload }) => {
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        const currentTab = tabRef.current;
        const wantsIncoming = binding.key === "warehouse_incoming_items";
        const scopeKey = wantsIncoming ? "incoming" : "expense";
        const tabMatches =
          (wantsIncoming && currentTab === TAB_INCOMING) ||
          (!wantsIncoming && currentTab === TAB_EXPENSE);

        if (!tabMatches) {
          recordPlatformGuardSkip("inactive_tab", {
            screen: "warehouse",
            surface: "screen_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              activeTab: currentTab,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        const networkSnapshot = getPlatformNetworkSnapshot();
        if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
          recordPlatformGuardSkip("network_known_offline", {
            screen: "warehouse",
            surface: "screen_root",
            event: "realtime_refresh_skipped_offline",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopeKey,
              networkKnownOffline: true,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        const refreshInFlight = wantsIncoming
          ? isIncomingRefreshInFlightRef.current()
          : isExpenseRefreshInFlightRef.current();
        if (refreshInFlight) {
          recordPlatformGuardSkip("in_flight", {
            screen: "warehouse",
            surface: "screen_root",
            event: "realtime_refresh_skipped_inflight",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopeKey,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        const now = Date.now();
        const lastAt = lastRealtimeAtByScopeRef.current[scopeKey] ?? 0;
        if (
          isPlatformGuardCoolingDown({
            lastAt,
            minIntervalMs: WAREHOUSE_REALTIME_GUARD_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_same_scope", {
            screen: "warehouse",
            surface: "screen_root",
            event: "realtime_refresh_skipped_recent",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopeKey,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        lastRealtimeAtByScopeRef.current[scopeKey] = now;
        recordPlatformObservability({
          screen: "warehouse",
          surface: "screen_root",
          category: "reload",
          event: "realtime_refresh_triggered",
          result: "success",
          trigger: "realtime",
          sourceKind: "supabase:postgres_changes",
          extra: {
            bindingKey: binding.key,
            table: binding.table,
            owner: binding.owner,
            eventType: payload.eventType,
            scopeKey,
            lifecycleOwner: "realtime_lifecycle",
          },
        });
        const refresh = wantsIncoming
          ? refreshIncomingRef.current
          : refreshExpenseRef.current;
        if (isWarehouseScreenActive(screenActiveRef)) {
          void refresh();
        }
      },
    });

    return () => {
      // P0: Defer channel detach to avoid native WebSocket close during React
      // teardown. detach() is idempotent — calling after channel is gone is a no-op.
      registerTimeout("warehouse:realtime:deferred-detach", detach, 0);
    };
  }, [screenActiveRef]);

  useFocusEffect(bindRealtime);
}
