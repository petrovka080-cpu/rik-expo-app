/**
 * useScreenFocusRevalidation.ts — S3: Lifecycle / Field Reliability Hardening
 *
 * Shared hook: normalises the screen blur → focus data-revalidation pattern.
 * This is the screen-focus equivalent of useAppActiveRevalidation.
 *
 * Use-case: when a user returns to a screen after navigating to a child route
 * (office_return) or switching back from another app route, data may have
 * gone stale. This hook fires onRevalidate with cooldown + guards so that
 * the freshness cache deduplicates rapid refocuses.
 *
 * Contract:
 * - Uses useFocusEffect to detect focus gain
 * - Does NOT fire on initial focus (first mount) — that is handled by the
 *   screen's bootstrap/init path. Set skipFirstFocus=false to override.
 * - Applies cooldown guard (default 2000ms — slightly looser than AppState
 *   since focus events can fire rapidly during tab switching)
 * - Skips when known offline
 * - Skips when a refresh is already in flight
 * - Fires onRevalidate("screen_focus") or onRevalidate("office_return")
 *
 * Usage (Buyer screen_focus on office return):
 *   useScreenFocusRevalidation({
 *     screen: "buyer",
 *     surface: "summary_root",
 *     enabled: true,
 *     reason: "office_return",
 *     onRevalidate: async () => {
 *       await refresh({ reason: "focus", scopes: ["inbox", "buckets"], force: false });
 *     },
 *     isInFlight: () => summaryService.isInFlight(),
 *   });
 */

import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

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

const DEFAULT_MIN_INTERVAL_MS = 2000;

export type UseScreenFocusRevalidationParams = {
  /** Observability screen identifier — must be a valid PlatformObservabilityScreen value */
  screen: ObservabilityScreen;
  /** Observability surface identifier */
  surface: string;
  /**
   * When false, onRevalidate is not called even if focus is gained.
   * Use to temporarily disable (e.g. during bootstrap).
   */
  enabled: boolean;
  /**
   * When true (default), the first focus event after mount is skipped.
   * The screen's own bootstrap/init path handles the initial load.
   * Set to false if you want to also trigger on the very first focus.
   */
  skipFirstFocus?: boolean;
  /** Canonical reason to pass to onRevalidate. Default: "screen_focus" */
  reason?: LifecycleRefreshReason;
  /** Minimum ms between revalidations triggered by focus events. Default: 2000ms */
  minIntervalMs?: number;
  /** Called when focus is gained AND all guards pass */
  onRevalidate: (reason: LifecycleRefreshReason) => Promise<void> | void;
  /** Optional: return true if a refresh is currently in flight */
  isInFlight?: () => boolean;
};

export function useScreenFocusRevalidation(
  params: UseScreenFocusRevalidationParams,
): void {
  const {
    screen,
    surface,
    enabled,
    skipFirstFocus = true,
    reason = "screen_focus",
    minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
    onRevalidate,
    isInFlight,
  } = params;

  const enabledRef = useRef(enabled);
  const onRevalidateRef = useRef(onRevalidate);
  const isInFlightRef = useRef(isInFlight);
  const lastRevalidatedAtRef = useRef(0);
  const isFirstFocusRef = useRef(true);

  enabledRef.current = enabled;
  onRevalidateRef.current = onRevalidate;
  isInFlightRef.current = isInFlight;

  const onFocus = useCallback(() => {
    // Skip the very first focus (bootstrap handles it)
    if (isFirstFocusRef.current) {
      isFirstFocusRef.current = false;
      if (skipFirstFocus) return;
    }

    if (!enabledRef.current) {
      recordPlatformGuardSkip("not_focused", {
        screen,
        surface,
        event: "screen_focus_revalidation_skipped",
        trigger: reason,
        extra: { reason: "enabled_false", owner: "useScreenFocusRevalidation" },
      });
      return;
    }

    // Network guard
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen,
        surface,
        event: "screen_focus_revalidation_skipped",
        trigger: reason,
        extra: {
          networkKnownOffline: true,
          owner: "useScreenFocusRevalidation",
        },
      });
      return;
    }

    // Inflight guard
    if (isInFlightRef.current?.()) {
      recordPlatformGuardSkip("in_flight", {
        screen,
        surface,
        event: "screen_focus_revalidation_skipped",
        trigger: reason,
        extra: { owner: "useScreenFocusRevalidation" },
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
        event: "screen_focus_revalidation_skipped",
        trigger: reason,
        extra: {
          minIntervalMs,
          elapsedMs: now - lastRevalidatedAtRef.current,
          owner: "useScreenFocusRevalidation",
        },
      });
      return;
    }

    lastRevalidatedAtRef.current = now;

    recordPlatformObservability({
      screen,
      surface,
      category: "reload",
      event: "screen_focus_revalidation_triggered",
      result: "success",
      trigger: reason,
      sourceKind: "expo-router:useFocusEffect",
      extra: { owner: "useScreenFocusRevalidation" },
    });

    void Promise.resolve(onRevalidateRef.current(reason)).catch(() => {
      // Revalidation failures are non-fatal for the lifecycle listener.
    });
  }, [minIntervalMs, reason, screen, skipFirstFocus, surface]);

  useFocusEffect(onFocus);
}
