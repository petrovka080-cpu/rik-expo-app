import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { expectExactEstimateCoreInvariants, ROOF_INPUT_RU } from "./exactEstimateTestHelpers";

describe("user input work detection for exact material price estimate", () => {
  it("detects roof waterproofing from natural-language input", () => {
    const result = buildExactMaterialPriceEstimate({ text: ROOF_INPUT_RU });

    expect(result.work.work_key).toBe("roof_waterproofing");
    expect(result.input.quantity).toBe(120);
    expect(result.input.unit).toBe("sq_m");
    expectExactEstimateCoreInvariants(result);
  });
});
