import { MARKET_UNIT_CONVERSIONS } from "./marketPricebookTestHelpers";

describe("market material unit conversions", () => {
  it("locks a minimum governed conversion set", () => {
    expect(MARKET_UNIT_CONVERSIONS.length).toBeGreaterThanOrEqual(40);
    expect(MARKET_UNIT_CONVERSIONS.every((item) => item.factor > 0)).toBe(true);
  });
});
