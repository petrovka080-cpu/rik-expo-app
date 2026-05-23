import { buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF Cyrillic", () => {
  it("extracts readable Cyrillic text from the generated PDF", () => {
    const { validation } = generateAndValidateLivePdf(
      buildLiveEstimate("дай смету на устройство двускатной крыши основание 100 кв метров", "/chat"),
    );

    expect(validation.text).toContain("Смета");
    expect(validation.text).toContain("двускатной крыши");
    expect(validation.details.cyrillicReadable).toBe(true);
  });
});
