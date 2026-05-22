import { UnsafeGlobalEstimateOutputError, assertNoLlmPriceOrTaxWithoutBackendResult } from "../../src/lib/ai/globalEstimate";
import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate guard", () => {
  it("blocks price or tax output without backend result", async () => {
    expect(() => assertNoLlmPriceOrTaxWithoutBackendResult(null)).toThrow(UnsafeGlobalEstimateOutputError);
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    expect(() => assertNoLlmPriceOrTaxWithoutBackendResult(result)).not.toThrow();
  });
});
