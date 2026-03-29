import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import { subscribeChannel } from "../../lib/realtime/realtime.client";
import {
  DIRECTOR_REPORTS_REALTIME_BINDINGS,
  DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
  type RealtimeChannelBinding,
} from "../../lib/realtime/realtime.channels";

const DIRECTOR_REPORTS_REALTIME_SURFACE = "reports_realtime";

type DirectorReportsRealtimeMeta = {
  binding: RealtimeChannelBinding;
  eventType: string;
  queued: boolean;
};

const buildScopeKey = () => "reports";

export function useDirectorReportsRealtimeLifecycle(params: {
  focusedRef: MutableRefObject<boolean>;
  visible: boolean;
  refreshReportsScope: () => Promise<void>;
  isRefreshInFlight: () => boolean;
}) {
  const visibleRef = useRef(params.visible);
  const refreshRef = useRef(params.refreshReportsScope);
  const isRefreshInFlightRef = useRef(params.isRefreshInFlight);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const queuedMetaRef = useRef<DirectorReportsRealtimeMeta | null>(null);

  useEffect(() => {
    visibleRef.current = params.visible;
    if (!params.visible) {
      queuedMetaRef.current = null;
    }
  }, [params.visible]);
  useEffect(() => {
    refreshRef.current = params.refreshReportsScope;
  }, [params.refreshReportsScope]);
  useEffect(() => {
    isRefreshInFlightRef.current = params.isRefreshInFlight;
  }, [params.isRefreshInFlight]);

  useEffect(() => {
    if (!params.visible) return;
    if (inFlightRef.current) return;
    if (isRefreshInFlightRef.current()) return;
    const queued = queuedMetaRef.current;
    if (!queued) return;
    queuedMetaRef.current = null;

    const task = Promise.resolve().then(async () => {
      recordPlatformObservability({
        screen: "director",
        surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
        category: "reload",
        event: "realtime_refresh_triggered",
        result: "success",
        trigger: "realtime",
        sourceKind: "supabase:postgres_changes",
        extra: {
          bindingKey: queued.binding.key,
          table: queued.binding.table,
          owner: queued.binding.owner,
          eventType: queued.eventType,
          scopeKey: buildScopeKey(),
          lifecycleOwner: "director_reports_realtime_lifecycle",
          queuedRerun: queued.queued,
        },
      });
      await refreshRef.current();
    }).finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = task;
  });

  useEffect(() => {
    if (!params.visible) return undefined;

    const detach = subscribeChannel({
      name: DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
      scope: "director",
      route: "/director",
      surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
      bindings: DIRECTOR_REPORTS_REALTIME_BINDINGS,
      onEvent: ({ binding, payload }) => {
        if (!params.focusedRef.current || !visibleRef.current) {
          recordPlatformGuardSkip("inactive_tab", {
            screen: "director",
            surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
            event: "realtime_refresh_skipped_hidden",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopeKey: buildScopeKey(),
              owner: "director_reports_realtime_lifecycle",
            },
          });
          return;
        }

        const networkSnapshot = getPlatformNetworkSnapshot();
        if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
          recordPlatformGuardSkip("network_known_offline", {
            screen: "director",
            surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
            event: "realtime_refresh_skipped_offline",
            trigger: "realtime",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              scopeKey: buildScopeKey(),
              networkKnownOffline: true,
              owner: "director_reports_realtime_lifecycle",
            },
          });
          return;
        }

        if (inFlightRef.current || isRefreshInFlightRef.current()) {
          queuedMetaRef.current = {
            binding,
            eventType: payload.eventType,
            queued: true,
          };
          recordPlatformObservability({
            screen: "director",
            surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
            category: "reload",
            event: "realtime_refresh_coalesced",
            result: "queued_rerun",
            trigger: "realtime",
            sourceKind: "supabase:postgres_changes",
            extra: {
              bindingKey: binding.key,
              table: binding.table,
              owner: binding.owner,
              eventType: payload.eventType,
              scopeKey: buildScopeKey(),
              lifecycleOwner: "director_reports_realtime_lifecycle",
            },
          });
          return;
        }

        const task = Promise.resolve().then(async () => {
          recordPlatformObservability({
            screen: "director",
            surface: DIRECTOR_REPORTS_REALTIME_SURFACE,
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
              scopeKey: buildScopeKey(),
              lifecycleOwner: "director_reports_realtime_lifecycle",
              queuedRerun: false,
            },
          });
          await refreshRef.current();
        }).finally(() => {
          inFlightRef.current = null;
        });
        inFlightRef.current = task;
      },
    });

    return () => {
      queuedMetaRef.current = null;
      detach();
    };
  }, [params.focusedRef, params.visible]);
}
