import { assertNoLlmPriceOrTaxWithoutBackendResult } from "../../src/lib/ai/globalEstimate";

describe("no price without backend result", () => {
  it("requires GlobalEstimateResult before any price answer is allowed", () => {
    expect(() => assertNoLlmPriceOrTaxWithoutBackendResult(undefined)).toThrow(
      "GLOBAL_ESTIMATE_BACKEND_RESULT_REQUIRED_BEFORE_PRICE_OR_TAX_OUTPUT",
    );
  });
});
