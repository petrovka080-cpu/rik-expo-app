import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";
import { subscribeChannel } from "../../lib/realtime/realtime.client";
import {
  ACCOUNTANT_REALTIME_BINDINGS,
  ACCOUNTANT_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";
import type { NotificationRow, Tab } from "./types";

const ACCOUNTANT_REALTIME_GUARD_MS = 2000;

export function useAccountantRealtimeLifecycle(params: {
  focusedRef: React.MutableRefObject<boolean>;
  freezeWhileOpen: boolean;
  currentTab: Tab;
  historyTab: Tab;
  refreshCurrentVisibleScope: () => Promise<void>;
  isRefreshInFlight: () => boolean;
  onRealtimeNotification: (notification: NotificationRow) => void;
}) {
  const freezeWhileOpenRef = useRef(params.freezeWhileOpen);
  const currentTabRef = useRef(params.currentTab);
  const refreshRef = useRef(params.refreshCurrentVisibleScope);
  const isRefreshInFlightRef = useRef(params.isRefreshInFlight);
  const notificationRef = useRef(params.onRealtimeNotification);
  const lastRealtimeAtByScopeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    freezeWhileOpenRef.current = params.freezeWhileOpen;
  }, [params.freezeWhileOpen]);
  useEffect(() => {
    currentTabRef.current = params.currentTab;
  }, [params.currentTab]);
  useEffect(() => {
    refreshRef.current = params.refreshCurrentVisibleScope;
  }, [params.refreshCurrentVisibleScope]);
  useEffect(() => {
    isRefreshInFlightRef.current = params.isRefreshInFlight;
  }, [params.isRefreshInFlight]);
  useEffect(() => {
    notificationRef.current = params.onRealtimeNotification;
  }, [params.onRealtimeNotification]);

  const bindRealtime = useCallback(() => {
    const detach = subscribeChannel({
      name: ACCOUNTANT_REALTIME_CHANNEL_NAME,
      scope: "accountant",
      route: "/accountant",
      surface: "screen_root",
      bindings: ACCOUNTANT_REALTIME_BINDINGS,
      onEvent: ({ binding, payload }) => {
        if (binding.key === "accountant_notifications") {
          const next = payload.new;
          if (!next || typeof next !== "object") return;
          notificationRef.current(next as NotificationRow);
          return;
        }

        if (!params.focusedRef.current) {
          recordPlatformGuardSkip("not_focused", {
            screen: "accountant",
            surface: "screen_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, owner: "realtime_lifecycle" },
          });
          return;
        }

        if (freezeWhileOpenRef.current) {
          recordPlatformGuardSkip("frozen_modal", {
            screen: "accountant",
            surface: "screen_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, owner: "realtime_lifecycle" },
          });
          return;
        }

        const networkSnapshot = getPlatformNetworkSnapshot();
        if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
          recordPlatformGuardSkip("network_known_offline", {
            screen: "accountant",
            surface: "screen_root",
            event: "realtime_refresh_skipped_offline",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              networkKnownOffline: true,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        if (isRefreshInFlightRef.current()) {
          recordPlatformGuardSkip("in_flight", {
            screen: "accountant",
            surface: "screen_root",
            event: "realtime_refresh_skipped_inflight",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, owner: "realtime_lifecycle" },
          });
          return;
        }

        const scopeKey = currentTabRef.current === params.historyTab ? "history" : `inbox:${currentTabRef.current}`;
        const now = Date.now();
        const lastAt = lastRealtimeAtByScopeRef.current[scopeKey] ?? 0;
        if (
          isPlatformGuardCoolingDown({
            lastAt,
            minIntervalMs: ACCOUNTANT_REALTIME_GUARD_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_same_scope", {
            screen: "accountant",
            surface: "screen_root",
            event: "realtime_refresh_skipped_recent",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, scopeKey, owner: "realtime_lifecycle" },
          });
          return;
        }

        lastRealtimeAtByScopeRef.current[scopeKey] = now;
        recordPlatformObservability({
          screen: "accountant",
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
        void refreshRef.current();
      },
    });

    return () => {
      detach();
    };
  }, [params.focusedRef, params.historyTab]);

  useFocusEffect(bindRealtime);
}
