import { validateNoFakePrices } from "../../scripts/estimate/validateNoFakePrices";

describe("no fake commercial total", () => {
  it("hides final totals when prices are missing or rejected", () => {
    const validation = validateNoFakePrices();

    expect(validation.no_fake_prices_validation_passed).toBe(true);
    expect(validation.missing_price_not_zero).toBe(true);
    expect(validation.missing_price_not_question_mark).toBe(true);
    expect(validation.ai_price_rejected).toBe(true);
    expect(validation.historical_unverified_price_rejected).toBe(true);
    expect(validation.currency_mismatch_rejected).toBe(true);
    expect(validation.full_total_hidden_if_prices_missing).toBe(true);
    expect(validation.blockers).toEqual([]);
  });
});
