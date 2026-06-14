import { professionalPricebookAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate no random prices", () => {
  it("does not invent random or zero known prices", () => {
    const result = professionalPricebookAudit();
    expect(result.random_prices_found).toBe(0);
    expect(result.zero_as_known_price_found).toBe(0);
  });
});
