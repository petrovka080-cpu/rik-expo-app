import { materialSummary } from "./marketPricebookTestHelpers";

describe("market pricebook missing material honesty", () => {
  it("reports missing materials through the queue without faking them", () => {
    expect(materialSummary().missing_materials_reported_honestly).toBe(true);
    expect(materialSummary().missing_materials_for_deep_golden_300).toBe(0);
  });
});
