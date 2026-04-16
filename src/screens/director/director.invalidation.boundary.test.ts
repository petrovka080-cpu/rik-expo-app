/**
 * P6.6 — Director Invalidation Boundary Contract Tests
 *
 * Verifies the structural invariants established by the P6.6 wave:
 * 1. Finance realtime uses invalidation (not direct refetch)
 * 2. Notification INSERT only refreshes Requests tab
 * 3. No duplicate reload triggers from concurrent paths
 * 4. Realtime lifecycle controllers refresh via invalidation
 */
import { readFileSync } from "fs";
import { join } from "path";

describe("P6.6 finance realtime invalidation contract", () => {
  const controllerSource = readFileSync(
    join(__dirname, "useDirectorScreenController.ts"),
    "utf8",
  );

  it("refreshFinanceRealtimeScope calls invalidateFinance (not fetchFinance)", () => {
    // P6.6-FIX-1: realtime must go through React Query invalidation
    // so React Query can deduplicate with any lifecycle-triggered refetch
    expect(controllerSource).toContain("await invalidateFinance()");
    expect(controllerSource).toContain("const { invalidateFinance } = financeQuery");
  });

  it("refreshFinanceRealtimeScope does NOT call fetchFinance directly", () => {
    // Extract just the refreshFinanceRealtimeScope function body
    const fnMatch = controllerSource.match(
      /refreshFinanceRealtimeScope\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{([^}]+)\}/,
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![1];
    expect(fnBody).not.toContain("fetchFinance");
    expect(fnBody).toContain("invalidateFinance");
  });

  it("invalidateFinance is destructured from financeQuery", () => {
    // Ensures the invalidation comes from the React Query hook,
    // not a manual implementation
    expect(controllerSource).toContain("const { invalidateFinance } = financeQuery");
  });
});

describe("P6.6 notification tab-guard contract", () => {
  const lifecycleSource = readFileSync(
    join(__dirname, "director.lifecycle.ts"),
    "utf8",
  );

  it("notification INSERT only refreshes when user is on Requests tab", () => {
    // P6.6-FIX-6: notification INSERT has no semantic connection
    // to finance/report data. Only refresh on Requests tab.
    expect(lifecycleSource).toContain(
      "dirTabRef.current === DIRECTOR_TAB_REQUESTS",
    );
  });

  it("notification INSERT still shows the toast regardless of active tab", () => {
    // Toast should be shown unconditionally — only the data refresh is guarded
    const notifHandler = lifecycleSource.match(
      /table:\s*"notifications"[\s\S]*?showRtToastRef\.current/,
    );
    expect(notifHandler).not.toBeNull();

    // The refresh guard must come AFTER the toast, not replace it
    const toastIdx = lifecycleSource.indexOf("showRtToastRef.current(notification.title, notification.body)");
    const guardIdx = lifecycleSource.indexOf(
      'dirTabRef.current === DIRECTOR_TAB_REQUESTS',
    );
    expect(toastIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeGreaterThan(toastIdx);
  });

  it("notification handler comment documents P6.6 rationale", () => {
    expect(lifecycleSource).toContain(
      "P6.6: Only refresh Requests data",
    );
  });
});

describe("P6.6 realtime lifecycle architecture contracts", () => {
  const financeRealtimeSource = readFileSync(
    join(__dirname, "director.finance.realtime.lifecycle.ts"),
    "utf8",
  );
  const reportsRealtimeSource = readFileSync(
    join(__dirname, "director.reports.realtime.lifecycle.ts"),
    "utf8",
  );

  it("finance realtime lifecycle checks isRefreshInFlight before starting", () => {
    // This prevents double-fetch when lifecycle already triggered a refetch
    expect(financeRealtimeSource).toContain("isRefreshInFlightRef.current()");
  });

  it("reports realtime lifecycle checks isRefreshInFlight before starting", () => {
    expect(reportsRealtimeSource).toContain("isRefreshInFlightRef.current()");
  });

  it("finance realtime lifecycle coalesces queued events during inflight", () => {
    expect(financeRealtimeSource).toContain("realtime_refresh_coalesced");
    expect(financeRealtimeSource).toContain("queued_rerun");
  });

  it("reports realtime lifecycle coalesces queued events during inflight", () => {
    expect(reportsRealtimeSource).toContain("realtime_refresh_coalesced");
    expect(reportsRealtimeSource).toContain("queued_rerun");
  });

  it("finance realtime lifecycle guards against offline refresh", () => {
    expect(financeRealtimeSource).toContain("networkKnownOffline");
  });

  it("reports realtime lifecycle guards against offline refresh", () => {
    expect(reportsRealtimeSource).toContain("networkKnownOffline");
  });

  it("finance realtime lifecycle guards against inactive tab refresh", () => {
    expect(financeRealtimeSource).toContain("inactive_tab");
    expect(financeRealtimeSource).toContain("realtime_refresh_skipped_hidden");
  });

  it("reports realtime lifecycle guards against inactive tab refresh", () => {
    expect(reportsRealtimeSource).toContain("inactive_tab");
    expect(reportsRealtimeSource).toContain("realtime_refresh_skipped_hidden");
  });
});

describe("P6.6 no-duplicate-reload structural invariants", () => {
  const lifecycleSource = readFileSync(
    join(__dirname, "director.lifecycle.ts"),
    "utf8",
  );

  it("lifecycle app_resume uses cooldown guard to prevent rapid re-refresh", () => {
    expect(lifecycleSource).toContain("isPlatformGuardCoolingDown");
    expect(lifecycleSource).toContain("DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS");
  });

  it("lifecycle runRefresh joins inflight requests instead of starting duplicates", () => {
    expect(lifecycleSource).toContain("joined_inflight");
    expect(lifecycleSource).toContain("queued_rerun");
  });

  it("lifecycle web_resume has its own dedup guard separate from AppState", () => {
    expect(lifecycleSource).toContain("lastWebResumeAtRef");
  });
});
