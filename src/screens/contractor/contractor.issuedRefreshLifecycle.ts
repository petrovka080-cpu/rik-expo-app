import { useCallback, useEffect, useRef } from "react";
import { ensurePlatformNetworkService } from "../../lib/offline/platformNetwork.service";
import { selectPlatformOnlineFlag } from "../../lib/offline/platformOffline.model";
import {
  getLifecycleCurrentAppState,
  subscribeLifecycleAppActiveTransition,
  subscribeLifecycleNetworkRecovery,
} from "../../lib/lifecycle/useAppActiveRevalidation";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";

const ISSUED_REFRESH_MIN_INTERVAL_MS = 1200;
const ISSUED_REFRESH_SOURCE_KIND = "client:event_driven:issued_refresh";

type TriggerKind = "section_open" | "app_active" | "network_back" | "data_refresh";

type TickResult = {
  issuedItemCount: number;
  linkedRequestCount: number;
  hasHint: boolean;
};

type Params<RowT> = {
  enabled: boolean;
  progressId: string;
  looksLikeUuid: (value: string) => boolean;
  getCurrentRow: () => RowT | null;
  getRowProgressId: (row: RowT) => string;
  onTick: (row: RowT) => Promise<TickResult>;
};

export function useIssuedRefreshLifecycle<RowT>(params: Params<RowT>) {
  const { enabled, progressId, looksLikeUuid, getCurrentRow, getRowProgressId, onTick } = params;

  const inFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const appStateRef = useRef(getLifecycleCurrentAppState());
  const networkReadyRef = useRef(false);
  const networkOnlineRef = useRef<boolean | null>(null);

  const refreshIssued = useCallback(
    async (trigger: TriggerKind) => {
      if (!enabled) return;

      const normalizedProgressId = String(progressId || "").trim();
      if (!looksLikeUuid(normalizedProgressId)) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "contractor",
          surface: "issued_section",
          event: "refresh_issued_today",
          trigger,
          sourceKind: ISSUED_REFRESH_SOURCE_KIND,
          extra: {
            progressId: normalizedProgressId || null,
          },
        });
        return;
      }

      if (networkReadyRef.current && networkOnlineRef.current === false) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "contractor",
          surface: "issued_section",
          event: "refresh_issued_today",
          trigger,
          sourceKind: ISSUED_REFRESH_SOURCE_KIND,
          extra: {
            progressId: normalizedProgressId,
          },
        });
        return;
      }

      const row = getCurrentRow();
      if (!row || String(getRowProgressId(row) || "").trim() !== normalizedProgressId) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "contractor",
          surface: "issued_section",
          event: "refresh_issued_today",
          trigger,
          sourceKind: ISSUED_REFRESH_SOURCE_KIND,
          extra: {
            progressId: normalizedProgressId,
          },
        });
        return;
      }

      if (inFlightRef.current) {
        recordPlatformObservability({
          screen: "contractor",
          surface: "issued_section",
          category: "reload",
          event: "refresh_issued_today",
          result: "joined_inflight",
          trigger,
          sourceKind: ISSUED_REFRESH_SOURCE_KIND,
          extra: {
            progressId: normalizedProgressId,
          },
        });
        return;
      }

      const now = Date.now();
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastRefreshAtRef.current,
          minIntervalMs: ISSUED_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "contractor",
          surface: "issued_section",
          event: "refresh_issued_today",
          trigger,
          sourceKind: ISSUED_REFRESH_SOURCE_KIND,
          extra: {
            progressId: normalizedProgressId,
          },
        });
        return;
      }

      lastRefreshAtRef.current = now;
      inFlightRef.current = true;

      const observation = beginPlatformObservability({
        screen: "contractor",
        surface: "issued_section",
        category: "fetch",
        event: "refresh_issued_today",
        trigger,
        sourceKind: ISSUED_REFRESH_SOURCE_KIND,
      });

      try {
        const result = await onTick(row);
        observation.success({
          rowCount: result.issuedItemCount,
          extra: {
            progressId: normalizedProgressId,
            linkedRequestCount: result.linkedRequestCount,
            hasHint: result.hasHint,
          },
        });
      } catch (error) {
        observation.error(error, {
          errorStage: "load_issued_today",
          extra: {
            progressId: normalizedProgressId,
          },
        });
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, progressId, looksLikeUuid, getCurrentRow, getRowProgressId, onTick],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await ensurePlatformNetworkService();
      if (cancelled) return;
      networkReadyRef.current = true;
      networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLifecycleNetworkRecovery({
      networkOnlineRef,
      onRecovered: () => {
        if (!enabled) return;
        void refreshIssued("network_back");
      },
      onNetworkStateChange: () => {
        networkReadyRef.current = true;
      },
    });

    return unsubscribe;
  }, [enabled, refreshIssued]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeLifecycleAppActiveTransition({
      appStateRef,
      onBecameActive: () => {
        void refreshIssued("app_active");
      },
    });

    return unsubscribe;
  }, [enabled, refreshIssued]);

  useEffect(() => {
    if (!enabled) return;
    void refreshIssued("section_open");
  }, [enabled, progressId, onTick, refreshIssued]);

  return {
    refreshIssuedDataNow: refreshIssued,
  };
}
