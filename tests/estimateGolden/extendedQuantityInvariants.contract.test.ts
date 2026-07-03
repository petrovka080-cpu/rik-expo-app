import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate quantity invariants", () => {
  it("rejects fake prompt-area multiplication and repeated fake totals", () => {
    const summary = extended100CertificationSummary();

    expect(summary.quantity_invariants_passed).toBe(true);
    expect(summary.no_fake_area_multiplier).toBe(true);
    expect(summary.no_repeated_fake_totals).toBe(true);
    expect(summary.default_980_price_rejected).toBe(true);
    expect(summary.no_zero_amount_when_price_missing).toBe(true);
  });
});
