import {
  clearPendingOfficeRouteReturnReceipt,
  consumePendingOfficeRouteReturnReceipt,
  markPendingOfficeRouteReturnReceipt,
  peekPendingOfficeRouteReturnReceipt,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";

describe("office reentry route return receipt", () => {
  beforeEach(() => {
    clearPendingOfficeRouteReturnReceipt();
  });

  it("keeps the most recent receipt visible across consume until cleared", () => {
    const receipt = {
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "back",
    };

    markPendingOfficeRouteReturnReceipt(receipt);

    expect(peekPendingOfficeRouteReturnReceipt()).toEqual(receipt);
    expect(consumePendingOfficeRouteReturnReceipt()).toEqual(receipt);
    expect(peekPendingOfficeRouteReturnReceipt()).toEqual(receipt);
  });

  it("clears only matching receipts when a return payload is supplied", () => {
    const receipt = {
      sourceRoute: "/office/accountant",
      target: "/office",
      method: "back",
    };

    markPendingOfficeRouteReturnReceipt(receipt);
    clearPendingOfficeRouteReturnReceipt({
      ...receipt,
      owner: "office_index_route",
    });
    expect(peekPendingOfficeRouteReturnReceipt()).toBeNull();
  });

  it("supports full reset when no receipt is supplied", () => {
    markPendingOfficeRouteReturnReceipt({
      sourceRoute: "/office/foreman",
      target: "/office",
      method: "back",
    });

    clearPendingOfficeRouteReturnReceipt();
    expect(consumePendingOfficeRouteReturnReceipt()).toBeNull();
    expect(peekPendingOfficeRouteReturnReceipt()).toBeNull();
  });
});
