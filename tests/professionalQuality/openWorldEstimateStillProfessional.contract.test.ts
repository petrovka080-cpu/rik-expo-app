import { compileDynamicProfessionalBoq, validateDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq";
import { requireEstimatorPlan, UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("open-world estimates stay professional", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id has deep, validated BOQ rows", (testCase) => {
    const outcome = requireEstimatorPlan(testCase);
    if (!outcome.plan) throw new Error(`plan_missing:${testCase.id}`);
    const boq = compileDynamicProfessionalBoq(outcome.plan);
    const validation = validateDynamicProfessionalBoq(boq);
    expect(validation.failures).toEqual([]);
    expect(boq.rows.length).toBeGreaterThanOrEqual(testCase.minimumRows);
    expect(outcome.plan.boqPlan.exclusions.length).toBeGreaterThan(0);
    expect(outcome.plan.boqPlan.clarifyingQuestions.length).toBeGreaterThan(0);
  });
});
