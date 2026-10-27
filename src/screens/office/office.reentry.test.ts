import { resolveOfficeHubFocusRefreshPlan } from "./office.reentry";

describe("office.reentry", () => {
  it("keeps route-scope inactive owners out of focus refresh work", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: false,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 0,
        now: 10_000,
      }),
    ).toEqual({ kind: "scope_inactive" });
  });

  it("distinguishes bootstrap pending and bootstrap inflight states deterministically", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: false,
        initialBootstrapInFlight: true,
        focusRefreshInFlight: false,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 0,
        now: 10_000,
      }),
    ).toEqual({
      kind: "bootstrap_pending",
      reason: "bootstrap_inflight",
    });

    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: false,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 0,
        now: 10_000,
      }),
    ).toEqual({
      kind: "bootstrap_pending",
      reason: "bootstrap_pending",
    });
  });

  it("joins an existing focus refresh instead of starting a second one", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: true,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 1_000,
        now: 70_000,
      }),
    ).toEqual({
      kind: "joined_inflight",
      reason: "joined_inflight",
    });
  });

  it("skips refresh on a fresh warehouse return receipt before the TTL branch", () => {
    const receipt = {
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "explicit_navigate",
    };

    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: receipt,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 50_000,
        now: 55_000,
        ttlMs: 60_000,
      }),
    ).toEqual({
      kind: "skip_refresh",
      reason: "ttl_fresh",
      ageMs: 5_000,
      ttlMs: 60_000,
      freshnessSource: "warehouse_return_receipt",
      sourceRoute: "/office/warehouse",
      target: "/office",
      receipt,
    });
  });

  it("skips refresh when TTL is still fresh and no warehouse receipt needs special handling", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 50_000,
        now: 55_000,
        ttlMs: 60_000,
      }),
    ).toEqual({
      kind: "skip_refresh",
      reason: "ttl_fresh",
      ageMs: 5_000,
      ttlMs: 60_000,
    });
  });

  it("requests a focus refresh once TTL becomes stale", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: null,
        processedWarmOfficeReturnReceipt: null,
        lastSuccessfulLoadAt: 1_000,
        now: 70_000,
        ttlMs: 60_000,
      }),
    ).toEqual({
      kind: "refresh",
      reason: "stale_ttl",
      ageMs: 69_000,
      ttlMs: 60_000,
    });
  });
});
