import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";

const HVAC_PROMPT = "смета на установку системы кондиционирования на 258 кв метров";

describe("HVAC known work estimate routing", () => {
  it("routes air conditioning installation to the dynamic estimator instead of a template gap", () => {
    const outcome = resolveEstimatorOutcome({ text: HVAC_PROMPT, currency: "KGS" });

    expect(outcome.classification).toBe("PARSABLE_DYNAMIC_BOQ_OK");
    expect(outcome.failures).toEqual([]);
    expect(outcome.dynamicBoqUsed).toBe(true);
    expect(outcome.plan?.workKey).toBe("air_conditioning_system_installation");
    expect(outcome.plan?.semanticFrame.domain).toBe("hvac");
    expect(outcome.plan?.semanticFrame.object).toBe("air_conditioning_system");
    expect(outcome.plan?.category).toBe("heating_hvac");
    expect(outcome.plan?.quantities.areaM2).toBe(258);
  });
});
