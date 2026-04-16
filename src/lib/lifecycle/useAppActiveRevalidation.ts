/**
 * useAppActiveRevalidation.ts — S3: Lifecycle / Field Reliability Hardening
 *
 * Shared hook: normalises the AppState → data-revalidation pattern that was
 * previously duplicated across Director, Contractor, and Warehouse screens
 * (and missing from Buyer).
 *
 * Contract:
 * - Listens to AppState "change" events
 * - Fires onRevalidate(reason) when app transitions from background/inactive → active
 * - Applies cooldown guard (default 1200ms) to prevent rapid re-fire
 * - Skips when known offline (based on platformNetworkStore)
 * - Skips when a refresh is already in flight (isInFlight guard)
 * - Cleans up listener on unmount
 * - Does NOT start a new listener when enabled toggles to false (just skips callback)
 *
 * Usage:
 *   useAppActiveRevalidation({
 *     screen: "buyer",
 *     surface: "summary_root",
 *     enabled: isScreenFocused,
 *     onRevalidate: async (reason) => { await refresh({ reason: "focus", force: false }); },
 *     isInFlight: () => summaryService.isInFlight(),
 *   });
 */

import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { getPlatformNetworkSnapshot } from "../offline/platformNetwork.service";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../observability/platformGuardDiscipline";
import {
  recordPlatformObservability,
  type PlatformObservabilityEvent,
} from "../observability/platformObservability";
import type { LifecycleRefreshReason } from "./lifecycleContract";

/** Narrowed to the same literal union used by the platform observability system */
type ObservabilityScreen = PlatformObservabilityEvent["screen"];

const DEFAULT_MIN_INTERVAL_MS = 1200;

export type UseAppActiveRevalidationParams = {
  /** Observability screen identifier — must be a valid PlatformObservabilityScreen value */
  screen: ObservabilityScreen;
  /** Observability surface identifier (e.g. "summary_root", "visible_scope") */
  surface: string;
  /**
   * When false, the AppState listener is still registered but onRevalidate
   * is not called. This avoids mount/unmount churn when screen temporarily
   * loses focus.
   */
  enabled: boolean;
  /** Minimum ms between revalidations. Default: 1200ms */
  minIntervalMs?: number;
  /**
   * Called when app transitions from background → active AND all guards pass.
   * Receives the canonical lifecycle reason ("app_became_active").
   */
  onRevalidate: (reason: LifecycleRefreshReason) => Promise<void> | void;
  /**
   * Optional: return true if a refresh is currently in flight.
   * When true, revalidation is skipped (inflight guard).
   */
  isInFlight?: () => boolean;
};

export function useAppActiveRevalidation(
  params: UseAppActiveRevalidationParams,
): void {
  const {
    screen,
    surface,
    enabled,
    minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
    onRevalidate,
    isInFlight,
  } = params;

  // Stable refs — never cause re-subscription
  const enabledRef = useRef(enabled);
  const onRevalidateRef = useRef(onRevalidate);
  const isInFlightRef = useRef(isInFlight);
  const lastRevalidatedAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  // Keep refs current without re-subscribing AppState
  enabledRef.current = enabled;
  onRevalidateRef.current = onRevalidate;
  isInFlightRef.current = isInFlight;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;

      // Only trigger on background/inactive → active transition
      const resumed =
        (previous === "background" || previous === "inactive") &&
        nextState === "active";
      if (!resumed) return;

      if (!enabledRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen,
          surface,
          event: "app_active_revalidation_skipped",
          trigger: "app_became_active",
          extra: { reason: "enabled_false", owner: "useAppActiveRevalidation" },
        });
        return;
      }

      // Network guard
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen,
          surface,
          event: "app_active_revalidation_skipped",
          trigger: "app_became_active",
          extra: {
            networkKnownOffline: true,
            owner: "useAppActiveRevalidation",
          },
        });
        return;
      }

      // Inflight guard
      if (isInFlightRef.current?.()) {
        recordPlatformGuardSkip("in_flight", {
          screen,
          surface,
          event: "app_active_revalidation_skipped",
          trigger: "app_became_active",
          extra: { owner: "useAppActiveRevalidation" },
        });
        return;
      }

      // Cooldown guard
      const now = Date.now();
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastRevalidatedAtRef.current,
          minIntervalMs,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen,
          surface,
          event: "app_active_revalidation_skipped",
          trigger: "app_became_active",
          extra: {
            minIntervalMs,
            elapsedMs: now - lastRevalidatedAtRef.current,
            owner: "useAppActiveRevalidation",
          },
        });
        return;
      }

      lastRevalidatedAtRef.current = now;

      recordPlatformObservability({
        screen,
        surface,
        category: "reload",
        event: "app_active_revalidation_triggered",
        result: "success",
        trigger: "app_became_active",
        sourceKind: "react-native:AppState",
        extra: { owner: "useAppActiveRevalidation" },
      });

      void Promise.resolve(onRevalidateRef.current("app_became_active")).catch(
        () => {
          // Revalidation failures are non-fatal for the lifecycle listener.
          // The screen's own error handling is responsible for surfacing failures.
        },
      );
    });

    return () => {
      try {
        subscription.remove();
      } catch {
        // best-effort cleanup
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable subscription, deps managed via refs
  }, [screen, surface, minIntervalMs]);
}
