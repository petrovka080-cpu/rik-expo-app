import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("estimate quality cross-domain blocker", () => {
  it("blocks injected cross-domain rows", () => {
    expectBlockedWith(blockedGateFor("foundation_carpet_row"), "CROSS_DOMAIN_ROW_LEAK");
  });
});
