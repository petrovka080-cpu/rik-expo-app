import { noFakeSummary } from "./marketPricebookTestHelpers";

describe("market pricebook fake suppliers", () => {
  it("does not use fake suppliers", () => {
    expect(noFakeSummary().fake_suppliers_found).toBe(0);
  });
});
