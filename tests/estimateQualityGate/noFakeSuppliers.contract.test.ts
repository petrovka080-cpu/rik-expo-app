import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("fake supplier quality guard", () => {
  it("blocks fake supplier markers", () => {
    expectBlockedWith(blockedGateFor("fake_supplier"), "FAKE_SUPPLIER_FOUND");
  });
});
