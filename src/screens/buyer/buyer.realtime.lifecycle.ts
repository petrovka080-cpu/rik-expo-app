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
  BUYER_REALTIME_BINDINGS,
  BUYER_REALTIME_CHANNEL_NAME,
  type RealtimeChannelBinding,
} from "../../lib/realtime/realtime.channels";
import type { BuyerSummaryRefreshReason, BuyerSummaryScope } from "./buyer.summary.service";
import type { BuyerTab } from "./buyer.types";

const BUYER_REALTIME_GUARD_MS = 2000;

const getRealtimeScopes = (activeTab: BuyerTab, binding: RealtimeChannelBinding): BuyerSummaryScope[] => {
  if (binding.key === "buyer_requests_approved") {
    return activeTab === "inbox" ? ["inbox"] : [];
  }
  if (binding.key === "buyer_proposals_terminal") {
    if (activeTab === "inbox") return ["inbox"];
    if (activeTab === "pending" || activeTab === "approved" || activeTab === "rejected") return ["buckets"];
  }
  return [];
};

export function useBuyerRealtimeLifecycle(params: {
  activeTab: BuyerTab;
  focusedRef: React.MutableRefObject<boolean>;
  onNotification: (title: string, message: string) => void;
  onRefreshScopes: (params: {
    reason: BuyerSummaryRefreshReason;
    scopes: BuyerSummaryScope[];
    force?: boolean;
  }) => Promise<void>;
  isRefreshInFlight: () => boolean;
}) {
  const activeTabRef = useRef(params.activeTab);
  const notificationRef = useRef(params.onNotification);
  const refreshRef = useRef(params.onRefreshScopes);
  const isRefreshInFlightRef = useRef(params.isRefreshInFlight);
  const lastRealtimeAtByScopeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    activeTabRef.current = params.activeTab;
  }, [params.activeTab]);
  useEffect(() => {
    notificationRef.current = params.onNotification;
  }, [params.onNotification]);
  useEffect(() => {
    refreshRef.current = params.onRefreshScopes;
  }, [params.onRefreshScopes]);
  useEffect(() => {
    isRefreshInFlightRef.current = params.isRefreshInFlight;
  }, [params.isRefreshInFlight]);

  const bindRealtime = useCallback(() => {
    const detach = subscribeChannel({
      name: BUYER_REALTIME_CHANNEL_NAME,
      scope: "buyer",
      route: "/buyer",
      surface: "summary_root",
      bindings: BUYER_REALTIME_BINDINGS,
      onEvent: ({ binding, payload }) => {
        if (binding.key === "buyer_notifications") {
          const next = payload.new;
          const notification = next && typeof next === "object" ? (next as Record<string, unknown>) : {};
          notificationRef.current(
            String(notification.title ?? "Уведомление"),
            String(notification.body ?? ""),
          );
          return;
        }

        if (!params.focusedRef.current) {
          recordPlatformGuardSkip("not_focused", {
            screen: "buyer",
            surface: "summary_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, owner: "realtime_lifecycle" },
          });
          return;
        }

        const scopes = getRealtimeScopes(activeTabRef.current, binding);
        if (!scopes.length) {
          recordPlatformGuardSkip("inactive_tab", {
            screen: "buyer",
            surface: "summary_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              activeTab: activeTabRef.current,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        const networkSnapshot = getPlatformNetworkSnapshot();
        if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
          recordPlatformGuardSkip("network_known_offline", {
            screen: "buyer",
            surface: "summary_root",
            event: "realtime_refresh_skipped_offline",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes,
              networkKnownOffline: true,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        if (isRefreshInFlightRef.current()) {
          recordPlatformGuardSkip("in_flight", {
            screen: "buyer",
            surface: "summary_root",
            event: "realtime_refresh_skipped_inflight",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        const scopeKey = scopes.join(",");
        const now = Date.now();
        const lastAt = lastRealtimeAtByScopeRef.current[scopeKey] ?? 0;
        if (
          isPlatformGuardCoolingDown({
            lastAt,
            minIntervalMs: BUYER_REALTIME_GUARD_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_same_scope", {
            screen: "buyer",
            surface: "summary_root",
            event: "realtime_refresh_skipped_recent",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        lastRealtimeAtByScopeRef.current[scopeKey] = now;
        recordPlatformObservability({
          screen: "buyer",
          surface: "summary_root",
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
            scopes,
            lifecycleOwner: "realtime_lifecycle",
          },
        });
        void refreshRef.current({
          reason: "realtime",
          scopes,
          force: true,
        });
      },
    });

    return () => {
      detach();
    };
  }, [params.focusedRef]);

  useFocusEffect(bindRealtime);
}
