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
  CONTRACTOR_REALTIME_BINDINGS,
  CONTRACTOR_REALTIME_CHANNEL_NAME,
  type RealtimeChannelBinding,
} from "../../lib/realtime/realtime.channels";
import type {
  ContractorReloadTrigger,
  ContractorVisibleScope,
} from "./hooks/useContractorScreenData";

const CONTRACTOR_REALTIME_GUARD_MS = 2000;

const getRealtimeScopes = (_binding: RealtimeChannelBinding): readonly ContractorVisibleScope[] => [
  "works_bundle",
  "inbox_scope",
];

export function useContractorRealtimeLifecycle(params: {
  focusedRef: React.MutableRefObject<boolean>;
  refreshVisibleContractorScopes: (params: {
    trigger?: ContractorReloadTrigger;
    scopes: readonly ContractorVisibleScope[];
    force?: boolean;
  }) => Promise<void> | void;
  isRefreshInFlight: () => boolean;
}) {
  const refreshRef = useRef(params.refreshVisibleContractorScopes);
  const isRefreshInFlightRef = useRef(params.isRefreshInFlight);
  const lastRealtimeAtByScopeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    refreshRef.current = params.refreshVisibleContractorScopes;
  }, [params.refreshVisibleContractorScopes]);
  useEffect(() => {
    isRefreshInFlightRef.current = params.isRefreshInFlight;
  }, [params.isRefreshInFlight]);

  const bindRealtime = useCallback(() => {
    const detach = subscribeChannel({
      name: CONTRACTOR_REALTIME_CHANNEL_NAME,
      scope: "contractor",
      route: "/contractor",
      surface: "screen_root",
      bindings: CONTRACTOR_REALTIME_BINDINGS,
      onEvent: ({ binding, payload }) => {
        if (!params.focusedRef.current) {
          recordPlatformGuardSkip("not_focused", {
            screen: "contractor",
            surface: "screen_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: { bindingKey: binding.key, table: binding.table, owner: "realtime_lifecycle" },
          });
          return;
        }

        const scopes = getRealtimeScopes(binding);
        if (!scopes.length) {
          recordPlatformGuardSkip("inactive_tab", {
            screen: "contractor",
            surface: "screen_root",
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              owner: "realtime_lifecycle",
              reason: "no_visible_scope",
            },
          });
          return;
        }

        const networkSnapshot = getPlatformNetworkSnapshot();
        if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
          recordPlatformGuardSkip("network_known_offline", {
            screen: "contractor",
            surface: "screen_root",
            event: "realtime_refresh_skipped_offline",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes: [...scopes],
              networkKnownOffline: true,
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        if (isRefreshInFlightRef.current()) {
          recordPlatformGuardSkip("in_flight", {
            screen: "contractor",
            surface: "screen_root",
            event: "realtime_refresh_skipped_inflight",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes: [...scopes],
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
            minIntervalMs: CONTRACTOR_REALTIME_GUARD_MS,
            now,
          })
        ) {
          recordPlatformGuardSkip("recent_same_scope", {
            screen: "contractor",
            surface: "screen_root",
            event: "realtime_refresh_skipped_recent",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopes: [...scopes],
              owner: "realtime_lifecycle",
            },
          });
          return;
        }

        lastRealtimeAtByScopeRef.current[scopeKey] = now;
        recordPlatformObservability({
          screen: "contractor",
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
            scopes: [...scopes],
            lifecycleOwner: "realtime_lifecycle",
          },
        });
        void refreshRef.current({
          trigger: "realtime",
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
