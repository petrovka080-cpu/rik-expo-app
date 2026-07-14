import { requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("embedded AI entrypoints accept any construction work estimate", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id works from embedded AI contexts", (testCase) => {
    expect(requireKnownWorkEstimate(testCase, "/ai?context=foreman").work.workKey).toBe(testCase.expectedWorkKey);
    expect(requireKnownWorkEstimate(testCase, "/ai?context=request").work.workKey).toBe(testCase.expectedWorkKey);
  });
});
