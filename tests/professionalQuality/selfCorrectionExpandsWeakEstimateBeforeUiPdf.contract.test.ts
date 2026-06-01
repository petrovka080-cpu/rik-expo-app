import { composeOpenWorldConstructionPreliminaryBoq } from "../../src/lib/ai/estimatorKernel";
import { validateDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq";
import { UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("self-correction expands weak estimates before UI/PDF", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id reaches professional row depth before presentation", (testCase) => {
    const composed = composeOpenWorldConstructionPreliminaryBoq(testCase.text);
    expect(composed.classification).toBe("preliminary_boq");
    expect(composed.plan?.workKey).toBe(testCase.expectedWorkKey);
    expect(composed.rowCount).toBeGreaterThanOrEqual(testCase.minimumRows);
    expect(composed.boq).toBeDefined();
    if (!composed.boq) throw new Error(`boq_missing:${testCase.id}`);
    expect(validateDynamicProfessionalBoq(composed.boq).passed).toBe(true);
  });
});
