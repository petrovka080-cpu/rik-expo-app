import { estimatorPlan, requestEstimate, rowText, UNIVERSAL_PROMPTS } from "./universalEstimatorTestHelpers";

describe("concrete pedestals dynamic BOQ", () => {
  it("uses dimensions and count to build formula-based BOQ", () => {
    const plan = estimatorPlan(UNIVERSAL_PROMPTS.concretePedestals);
    const outputs = plan.formulas[0]?.outputs ?? {};
    expect(outputs.volumeEachM3).toBe(1);
    expect(outputs.volumeTotalM3).toBe(10);
    expect(outputs.concreteWithWasteM3).toBe(10.5);
    expect(outputs.formworkTotalM2).toBe(90);

    const estimate = requestEstimate(UNIVERSAL_PROMPTS.concretePedestals);
    const text = rowText(estimate);
    for (const token of ["бетон", "арматура", "опалубка", "заливка бетона", "вибрирование", "уход за бетоном"]) {
      expect(text).toContain(token);
    }
  });
});
