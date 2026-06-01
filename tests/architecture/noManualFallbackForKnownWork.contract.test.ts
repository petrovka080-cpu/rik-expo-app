import { resolveOpenWorldKnownWorkPolicy } from "../../src/lib/ai/estimatorKernel";

describe("known work no manual fallback policy", () => {
  it("disallows template gap when the HVAC work is semantically known and parsable", () => {
    const decision = resolveOpenWorldKnownWorkPolicy("смета на установку системы кондиционирования на 258 кв метров");

    expect(decision.knownWorkDetected).toBe(true);
    expect(decision.templateGapAllowed).toBe(false);
    expect(decision.classification).toBe("PARSABLE_DYNAMIC_BOQ_OK");
    expect(decision.workKey).toBe("air_conditioning_system_installation");
  });
});
