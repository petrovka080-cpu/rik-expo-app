import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("zero as known price quality guard", () => {
  it("blocks verified zero prices", () => {
    expectBlockedWith(blockedGateFor("verified_zero_price"), "ZERO_AS_KNOWN_PRICE");
  });
});
