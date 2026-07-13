import { noFakeSummary } from "./marketPricebookTestHelpers";

describe("market pricebook zero price policy", () => {
  it("does not treat zero as a known price", () => {
    expect(noFakeSummary().zero_as_known_price_found).toBe(0);
  });
});
