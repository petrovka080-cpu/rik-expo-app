import {
  resolveOfficeHubFocusRefreshPlan,
  resolveOfficeWarmReturnReceipt,
} from "../../src/screens/office/office.reentry";
import { isWarehouseOfficeReturnReceipt } from "../../src/screens/office/officeHub.helpers";

describe("strict-null phase 5 office reentry slice", () => {
  it("keeps a valid warehouse return receipt intact", () => {
    const receipt = {
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "explicit_navigate",
    };

    expect(isWarehouseOfficeReturnReceipt(receipt)).toBe(true);
    expect(
      resolveOfficeWarmReturnReceipt({
        officeReturnReceipt: receipt,
        pendingOfficeReturnReceipt: null,
      }),
    ).toBe(receipt);
  });

  it("uses a pending warehouse return receipt when the active one is missing", () => {
    const pendingReceipt = {
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "pending_handoff",
    };

    expect(
      resolveOfficeWarmReturnReceipt({
        officeReturnReceipt: undefined,
        pendingOfficeReturnReceipt: pendingReceipt,
      }),
    ).toBe(pendingReceipt);
  });

  it("treats null and undefined receipts as absent", () => {
    expect(isWarehouseOfficeReturnReceipt(null)).toBe(false);
    expect(isWarehouseOfficeReturnReceipt(undefined)).toBe(false);
    expect(
      resolveOfficeWarmReturnReceipt({
        officeReturnReceipt: null,
        pendingOfficeReturnReceipt: undefined,
      }),
    ).toBeNull();
  });

  it("rejects partial receipts that do not describe the full warehouse handoff", () => {
    expect(
      resolveOfficeWarmReturnReceipt({
        officeReturnReceipt: {
          sourceRoute: "/office/warehouse",
        },
        pendingOfficeReturnReceipt: {
          target: "/office",
        },
      }),
    ).toBeNull();
  });

  it("rejects malformed receipt values and keeps focus refresh on the TTL branch", () => {
    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: {
          sourceRoute: 42,
          target: "/office",
        },
        pendingOfficeReturnReceipt: {
          sourceRoute: "/office/warehouse",
          target: 7,
        },
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

  it("keeps full-success behavior unchanged when only the pending receipt is valid", () => {
    const pendingReceipt = {
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "pending_handoff",
    };

    expect(
      resolveOfficeHubFocusRefreshPlan({
        routeScopeActive: true,
        ownerBootstrapCompleted: true,
        initialBootstrapInFlight: false,
        focusRefreshInFlight: false,
        officeReturnReceipt: {
          sourceRoute: "/office/warehouse",
        },
        pendingOfficeReturnReceipt: pendingReceipt,
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
      receipt: pendingReceipt,
    });
  });
});
