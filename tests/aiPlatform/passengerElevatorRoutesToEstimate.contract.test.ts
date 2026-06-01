import { requireEstimatorPlan, requireKnownWorkEstimate, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

const elevatorCase = UNIVERSAL_KNOWN_WORK_CASES.find((testCase) => testCase.id === "passenger_elevator");

describe("passenger elevator routes to estimate", () => {
  it("uses regulated elevator BOQ instead of role QA", () => {
    expect(elevatorCase).toBeDefined();
    if (!elevatorCase) throw new Error("elevator_case_missing");
    const outcome = requireEstimatorPlan(elevatorCase);
    const estimate = requireKnownWorkEstimate(elevatorCase, "/ai?context=foreman");
    expect(outcome.plan?.regulatedWorkDetected).toBe(true);
    expect(estimate.work.workKey).toBe("passenger_elevator_installation");
  });
});
