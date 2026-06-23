import { requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

describe("role context does not steal estimate intent", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id stays estimate in foreman AI", (testCase) => {
    requireKnownWorkEstimate(testCase, "/ai?context=foreman");
  });
});
