import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";

describe("concrete pedestal semantic frame", () => {
  it("keeps concrete pedestals separate from slab and screed work", () => {
    const outcome = resolveEstimatorOutcome({
      text: "смета на заливку бетонных тумб 12 шт",
      currency: "KGS",
    });

    expect(outcome.failures).toEqual([]);
    expect(outcome.plan?.workKey).toBe("concrete_pedestal_pour");
    expect(outcome.plan?.semanticFrame.object).toBe("concrete_pedestal");
    expect(outcome.plan?.semanticFrame.method).toBe("rectangular_concrete_element");
  });
});
