import { buildEstimatorReasoningPlan } from "../../src/lib/ai/estimatorKernel/buildEstimatorReasoningPlan";
import {
  CONCRETE_PEDESTAL_PROMPT,
  CONCRETE_PEDESTAL_VARIANTS,
} from "./concretePedestalTestHelpers";

describe("concrete pedestal semantic frame", () => {
  it("maps the exact pedestal prompt to the pedestal pour recipe", () => {
    const plan = buildEstimatorReasoningPlan({ text: CONCRETE_PEDESTAL_PROMPT });

    expect(plan?.workKey).toBe("concrete_pedestal_pour");
    expect(plan?.semanticFrame.domain).toBe("concrete");
    expect(plan?.semanticFrame.object).toBe("concrete_pedestal");
    expect(plan?.semanticFrame.operation).toBe("concrete_pour");
    expect(plan?.semanticFrame.method).toBe("concrete_pedestal_pour");
  });

  it("keeps metamorphic pedestal variants on the same semantic object", () => {
    for (const prompt of CONCRETE_PEDESTAL_VARIANTS) {
      const plan = buildEstimatorReasoningPlan({ text: prompt });

      expect(plan?.workKey).toBe("concrete_pedestal_pour");
      expect(plan?.semanticFrame.object).toBe("concrete_pedestal");
      expect(plan?.semanticFrame.operation).toBe("concrete_pour");
    }
  });
});
