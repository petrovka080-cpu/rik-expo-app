import { requireEstimatorPlan, requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

const drainageCase = UNIVERSAL_KNOWN_WORK_CASES.find((testCase) => testCase.id === "drainage_channel");

describe("drainage channel routes to estimate", () => {
  it("keeps drainage as drainage, not generic paving or plumbing", () => {
    expect(drainageCase).toBeDefined();
    if (!drainageCase) throw new Error("drainage_case_missing");
    const outcome = requireEstimatorPlan(drainageCase);
    const estimate = requireKnownWorkEstimate(drainageCase);
    expect(outcome.plan?.semanticFrame.domain).toBe("drainage");
    expect(estimate.work.workKey).toBe("drainage_channel_installation");
  });
});
