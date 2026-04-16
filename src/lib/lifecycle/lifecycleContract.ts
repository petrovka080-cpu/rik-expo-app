/**
 * lifecycleContract.ts — S3: Lifecycle / Field Reliability Hardening
 *
 * Canonical typed contract for lifecycle events, refresh reasons, and
 * data freshness states across all role screens.
 *
 * SCOPE: types + helpers only. No runtime side-effects.
 *
 * Why a shared contract?
 * - Before S3, each screen used free-form strings for refresh triggers
 *   ("app_resume", "app_active", "screen_init" etc.)
 * - This makes it impossible to audit coverage or write cross-screen tests
 * - The contract here normalises the taxonomy without changing runtime logic
 */

// ---------------------------------------------------------------------------
// 1. Lifecycle refresh reason taxonomy
// ---------------------------------------------------------------------------

/**
 * Typed set of all reasons a screen may trigger a data refresh.
 *
 * Mapping to existing per-screen strings:
 *   "initial_mount"          ← director: "screen_init"; contractor: "section_open"
 *   "screen_focus"           ← buyer/warehouse: useFocusEffect bind; director: tab focus
 *   "office_return"          ← OfficeHub: child route → back navigation
 *   "app_became_active"      ← director: "app_resume"; contractor/warehouse: "app_active"
 *   "manual_pull_to_refresh" ← buyer: "manual"; contractor: "data_refresh"
 *   "realtime_reconnect"     ← all: realtime channel reconnect after gap
 *   "network_recovered"      ← contractor/warehouse: "network_back"
 *   "tab_switch"             ← director: "tab_switch:*"
 *   "period_changed"         ← director: finance/report period selector change
 *   "mutation_complete"      ← buyer: "mutation"; post-submit refresh
 *   "realtime_event"         ← buyer/warehouse/director: "realtime:*"
 */
export type LifecycleRefreshReason =
  | "initial_mount"
  | "screen_focus"
  | "office_return"
  | "app_became_active"
  | "manual_pull_to_refresh"
  | "realtime_reconnect"
  | "network_recovered"
  | "tab_switch"
  | "period_changed"
  | "mutation_complete"
  | "realtime_event";

/**
 * All valid lifecycle refresh reasons as a frozen array.
 * Useful for exhaustiveness checks and test matricies.
 */
export const ALL_LIFECYCLE_REFRESH_REASONS: readonly LifecycleRefreshReason[] =
  Object.freeze([
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
  ] satisfies LifecycleRefreshReason[]);

// ---------------------------------------------------------------------------
// 2. Data freshness state model
// ---------------------------------------------------------------------------

/**
 * Honest model for screen-level data freshness.
 *
 * Semantics:
 *   "fresh"             Data was recently fetched and is believed accurate.
 *   "stale_visible"     Data is visible but known to be potentially outdated
 *                       (e.g. after failed resume refresh). User can still see it.
 *   "refreshing"        A refresh is currently in flight.
 *   "retryable_failure" Last refresh failed but can be retried (network, timeout).
 *   "terminal_failure"  Last refresh failed permanently (auth lost, RPC error).
 *
 * This type does NOT replace existing per-feature error states (foreman durable
 * draft, warehouse receive queue). It is for screen-level data presentation only.
 */
export type DataFreshnessState =
  | "fresh"
  | "stale_visible"
  | "refreshing"
  | "retryable_failure"
  | "terminal_failure";

// ---------------------------------------------------------------------------
// 3. Screen re-entry policy
// ---------------------------------------------------------------------------

/**
 * Policy for what happens when a screen regains focus (e.g. office return).
 *
 *   "reuse"         State survives blur — no refresh needed. Use when child
 *                   route exit cannot have affected parent data.
 *   "revalidate"    Soft revalidate subject to cooldown + cache freshness.
 *                   Use for most office return scenarios.
 *   "force_refresh" Always hard-refresh on re-entry. Use when child mutation
 *                   is known to invalidate parent (e.g. warehouse issue).
 */
export type ScreenReentryPolicy = "reuse" | "revalidate" | "force_refresh";

// ---------------------------------------------------------------------------
// 4. App-active revalidation config
// ---------------------------------------------------------------------------

/**
 * Minimal config for the useAppActiveRevalidation hook.
 * Kept here so tests can import the shape without importing the hook itself.
 */
export type AppActiveRevalidationConfig = {
  /** Observability screen identifier */
  screen: string;
  /** Observability surface identifier */
  surface: string;
  /** Whether the revalidation listener is currently active */
  enabled: boolean;
  /** Minimum ms between revalidations triggered by app-active events */
  minIntervalMs?: number;
};

// ---------------------------------------------------------------------------
// 5. Helpers
// ---------------------------------------------------------------------------

/** Returns true if the reason is triggered by user interaction (not system). */
export const isUserTriggeredReason = (
  reason: LifecycleRefreshReason,
): boolean =>
  reason === "manual_pull_to_refresh" || reason === "mutation_complete";

/** Returns true if the reason should bypass cooldown guards. */
export const isForceReason = (reason: LifecycleRefreshReason): boolean =>
  reason === "manual_pull_to_refresh" ||
  reason === "mutation_complete" ||
  reason === "realtime_event";

/** Returns true if the reason is a background system event (not user-initiated). */
export const isSystemResumeReason = (reason: LifecycleRefreshReason): boolean =>
  reason === "app_became_active" ||
  reason === "network_recovered" ||
  reason === "realtime_reconnect";
