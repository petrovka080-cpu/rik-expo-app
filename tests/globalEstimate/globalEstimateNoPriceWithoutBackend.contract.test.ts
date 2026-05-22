import {
  assertNoPriceOrTaxWithoutBackendResult,
  formatGlobalEstimateBackendUnavailableAnswer,
} from "../../src/lib/ai/globalEstimate";

describe("global estimate no price without backend contract", () => {
  it("does not allow price or tax output without GlobalEstimateResult", () => {
    const fallback = formatGlobalEstimateBackendUnavailableAnswer("en");
    expect(() => assertNoPriceOrTaxWithoutBackendResult(fallback, null)).not.toThrow();
    expect(() => assertNoPriceOrTaxWithoutBackendResult("Approximate price: 1000 USD plus VAT.", null)).toThrow(
      /GLOBAL_ESTIMATE_PRICE_OR_TAX_OUTPUT_REQUIRES_BACKEND_RESULT/,
    );
  });
});
