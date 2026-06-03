import { selfCorrectProfessionalEstimate } from "../../src/lib/ai/professionalQuality";
import { weakCanopyEstimate } from "./professionalEstimatorQualityTestHelpers";

describe("professional estimator self-correction semantic frame", () => {
  it("preserves the resolved work identity and original request", () => {
    const weak = weakCanopyEstimate();
    const corrected = selfCorrectProfessionalEstimate(weak);

    expect(corrected.work).toEqual(weak.work);
    expect(corrected.input.originalText).toBe(weak.input.originalText);
    expect(corrected.locale.currency).toBe(weak.locale.currency);
    expect(corrected.totals.grandTotal).toBeGreaterThan(0);
  });
});
