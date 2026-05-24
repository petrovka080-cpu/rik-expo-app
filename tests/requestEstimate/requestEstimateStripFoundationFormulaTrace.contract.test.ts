import {
  calculateGlobalConstructionEstimateSync,
  buildEstimateFormulaQualityTrace,
} from "../../src/lib/ai/globalEstimate";

describe("strip foundation formula trace", () => {
  it("keeps the concrete volume formula in backend trace, not in the request screen", () => {
    const result = calculateGlobalConstructionEstimateSync({
      text: "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const trace = buildEstimateFormulaQualityTrace(result);

    expect(trace.workKey).toBe("strip_foundation");
    expect(trace.stripFoundation?.formula).toBe("length * width * height");
    expect(trace.stripFoundation?.expectedConcreteVolumeM3).toBe(32.64);
    expect(trace.stripFoundation?.actualConcreteVolumeM3).toBe(32.64);
  });
});
