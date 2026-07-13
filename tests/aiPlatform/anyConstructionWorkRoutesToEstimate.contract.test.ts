import { requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

describe("any construction work routes to estimate", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES)("$id uses calculate_global_estimate", (testCase) => {
    requireKnownWorkEstimate(testCase);
  });
});
