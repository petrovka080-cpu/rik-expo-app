import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("random price quality guard", () => {
  it("blocks random price markers", () => {
    expectBlockedWith(blockedGateFor("random_price_marker"), "RANDOM_PRICE_FOUND");
  });
});
