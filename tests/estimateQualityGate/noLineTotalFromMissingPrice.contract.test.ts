import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("line total from missing price guard", () => {
  it("blocks PRICE_MISSING rows with line totals", () => {
    expectBlockedWith(blockedGateFor("missing_price_with_total"), "LINE_TOTAL_FROM_MISSING_PRICE");
  });
});
