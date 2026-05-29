import { embeddedEstimate, requestEstimate, UNIVERSAL_PROMPTS } from "./universalEstimatorTestHelpers";

describe("parsable work does not template-gap", () => {
  it("builds dynamic estimates for measurable construction work without exact governed templates", () => {
    for (const prompt of [
      UNIVERSAL_PROMPTS.elevator,
      UNIVERSAL_PROMPTS.drainage,
      UNIVERSAL_PROMPTS.concretePedestals,
      UNIVERSAL_PROMPTS.electrical,
    ]) {
      const estimate = requestEstimate(prompt);
      expect(estimate.work.workKey).not.toBe("other_construction_work");
      expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(18);
    }

    expect(embeddedEstimate(UNIVERSAL_PROMPTS.elevator, "request").work.workKey).toBe("passenger_elevator_installation");
  });
});
