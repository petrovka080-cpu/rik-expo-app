import { professionalPricebookAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate pricebook lookup", () => {
  it("uses governed missing-price behavior when no governed price exists", () => {
    const result = professionalPricebookAudit();
    expect(result.pricebook_cases_total).toBeGreaterThanOrEqual(500);
    expect(result.missing_prices_reported_honestly).toBe(true);
    expect(result.line_total_from_missing_price).toBe(0);
  });
});
