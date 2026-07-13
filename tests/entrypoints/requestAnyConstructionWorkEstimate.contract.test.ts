import { requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("request entrypoint accepts any construction work estimate", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id returns structured estimate", (testCase) => {
    const estimate = requireKnownWorkEstimate(testCase, "/request");
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(testCase.minimumRows);
  });
});
