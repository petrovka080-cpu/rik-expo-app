import { pricebookSummary } from "./marketPricebookTestHelpers";

describe("market pricebook production sources", () => {
  it("does not register fake production sources", () => {
    expect(pricebookSummary().fake_sources_found).toBe(0);
  });
});
