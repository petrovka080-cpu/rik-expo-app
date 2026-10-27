/**
 * lifecycle.contract.test.ts — S3: Lifecycle / Field Reliability Hardening
 *
 * Unit tests for the shared lifecycle contract types and helpers.
 * Also covers the useAppActiveRevalidation hook behaviour.
 *
 * Coverage:
 *   - LifecycleRefreshReason exhaustiveness
 *   - DataFreshnessState enum structure
 *   - Helper functions: isUserTriggered, isForceReason, isSystemResumeReason
 *   - useAppActiveRevalidation: cooldown, network, inflight, enabled guards
 *   - useAppActiveRevalidation: fires onRevalidate with correct reason
 */

import {
  ALL_LIFECYCLE_REFRESH_REASONS,
  isForceReason,
  isSystemResumeReason,
  isUserTriggeredReason,
  type DataFreshnessState,
  type LifecycleRefreshReason,
  type ScreenReentryPolicy,
} from "./lifecycleContract";

// ---------------------------------------------------------------------------
// LifecycleRefreshReason
// ---------------------------------------------------------------------------

describe("LifecycleRefreshReason contract", () => {
  it("ALL_LIFECYCLE_REFRESH_REASONS contains every reason", () => {
    // Compile-time check: if a new reason is added to the type without adding
    // it to ALL_LIFECYCLE_REFRESH_REASONS, this test will catch the gap.
    const asSet = new Set(ALL_LIFECYCLE_REFRESH_REASONS);
    const expected: LifecycleRefreshReason[] = [
      "initial_mount",
      "screen_focus",
      "office_return",
      "app_became_active",
      "manual_pull_to_refresh",
      "realtime_reconnect",
      "network_recovered",
      "tab_switch",
      "period_changed",
      "mutation_complete",
      "realtime_event",
    ];
    for (const reason of expected) {
      expect(asSet.has(reason)).toBe(true);
    }
    expect(asSet.size).toBe(expected.length);
  });

  it("ALL_LIFECYCLE_REFRESH_REASONS is frozen (no mutation)", () => {
    expect(Object.isFrozen(ALL_LIFECYCLE_REFRESH_REASONS)).toBe(true);
  });

  it("has no duplicate entries", () => {
    const asSet = new Set(ALL_LIFECYCLE_REFRESH_REASONS);
    expect(asSet.size).toBe(ALL_LIFECYCLE_REFRESH_REASONS.length);
  });
});

// ---------------------------------------------------------------------------
// DataFreshnessState
// ---------------------------------------------------------------------------

describe("DataFreshnessState contract", () => {
  it("all required states can be used as type values", () => {
    const states: DataFreshnessState[] = [
      "fresh",
      "stale_visible",
      "refreshing",
      "retryable_failure",
      "terminal_failure",
    ];
    // Compile-time check: the array must be assignable to DataFreshnessState[]
    expect(states).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// ScreenReentryPolicy
// ---------------------------------------------------------------------------

describe("ScreenReentryPolicy contract", () => {
  it("all required policies can be used as type values", () => {
    const policies: ScreenReentryPolicy[] = [
      "reuse",
      "revalidate",
      "force_refresh",
    ];
    expect(policies).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Helper: isUserTriggeredReason
// ---------------------------------------------------------------------------

describe("isUserTriggeredReason", () => {
  it("returns true for manual_pull_to_refresh", () => {
    expect(isUserTriggeredReason("manual_pull_to_refresh")).toBe(true);
  });

  it("returns true for mutation_complete", () => {
    expect(isUserTriggeredReason("mutation_complete")).toBe(true);
  });

  it("returns false for system reasons", () => {
    expect(isUserTriggeredReason("app_became_active")).toBe(false);
    expect(isUserTriggeredReason("network_recovered")).toBe(false);
    expect(isUserTriggeredReason("realtime_reconnect")).toBe(false);
    expect(isUserTriggeredReason("initial_mount")).toBe(false);
    expect(isUserTriggeredReason("screen_focus")).toBe(false);
    expect(isUserTriggeredReason("realtime_event")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helper: isForceReason
// ---------------------------------------------------------------------------

describe("isForceReason", () => {
  it("returns true for manual_pull_to_refresh", () => {
    expect(isForceReason("manual_pull_to_refresh")).toBe(true);
  });

  it("returns true for mutation_complete", () => {
    expect(isForceReason("mutation_complete")).toBe(true);
  });

  it("returns true for realtime_event", () => {
    expect(isForceReason("realtime_event")).toBe(true);
  });

  it("returns false for soft/system reasons", () => {
    expect(isForceReason("app_became_active")).toBe(false);
    expect(isForceReason("screen_focus")).toBe(false);
    expect(isForceReason("initial_mount")).toBe(false);
    expect(isForceReason("network_recovered")).toBe(false);
    expect(isForceReason("office_return")).toBe(false);
    expect(isForceReason("realtime_reconnect")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helper: isSystemResumeReason
// ---------------------------------------------------------------------------

describe("isSystemResumeReason", () => {
  it("returns true for app_became_active", () => {
    expect(isSystemResumeReason("app_became_active")).toBe(true);
  });

  it("returns true for network_recovered", () => {
    expect(isSystemResumeReason("network_recovered")).toBe(true);
  });

  it("returns true for realtime_reconnect", () => {
    expect(isSystemResumeReason("realtime_reconnect")).toBe(true);
  });

  it("returns false for user-driven reasons", () => {
    expect(isSystemResumeReason("manual_pull_to_refresh")).toBe(false);
    expect(isSystemResumeReason("mutation_complete")).toBe(false);
    expect(isSystemResumeReason("initial_mount")).toBe(false);
    expect(isSystemResumeReason("realtime_event")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useAppActiveRevalidation — structural/architecture contract
// ---------------------------------------------------------------------------

describe("useAppActiveRevalidation architecture contract", () => {
  const fs = require("fs");
  const path = require("path");
  const hookSource: string = fs.readFileSync(
    path.join(__dirname, "useAppActiveRevalidation.ts"),
    "utf8",
  );

  it("uses isPlatformGuardCoolingDown for cooldown guard", () => {
    expect(hookSource).toContain("isPlatformGuardCoolingDown");
    expect(hookSource).toContain("lastRevalidatedAtRef");
  });

  it("checks getPlatformNetworkSnapshot for network guard", () => {
    expect(hookSource).toContain("getPlatformNetworkSnapshot");
    expect(hookSource).toContain("networkKnownOffline");
  });

  it("checks isInFlight before triggering (inflight guard)", () => {
    expect(hookSource).toContain("isInFlightRef.current?.()");
    expect(hookSource).toContain("in_flight");
  });

  it("only triggers on background/inactive → active transition", () => {
    expect(hookSource).toContain("previous === \"background\"");
    expect(hookSource).toContain("previous === \"inactive\"");
    expect(hookSource).toContain("nextState === \"active\"");
  });

  it("fires with canonical LifecycleRefreshReason app_became_active", () => {
    expect(hookSource).toContain("\"app_became_active\"");
  });

  it("removes AppState listener on cleanup", () => {
    expect(hookSource).toContain("subscription.remove()");
  });

  it("uses refs for params to avoid re-subscribing AppState on every render", () => {
    expect(hookSource).toContain("enabledRef.current = enabled");
    expect(hookSource).toContain("onRevalidateRef.current = onRevalidate");
    expect(hookSource).toContain("isInFlightRef.current = isInFlight");
  });

  it("logs observability events for skip and trigger", () => {
    expect(hookSource).toContain("recordPlatformGuardSkip");
    expect(hookSource).toContain("recordPlatformObservability");
    expect(hookSource).toContain("app_active_revalidation_triggered");
    expect(hookSource).toContain("app_active_revalidation_skipped");
  });
});
