import { planBuiltInAi50000Phase3DangerousSafetySample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 dangerous safety coverage", () => {
  it("selects 50 dangerous/specialist review cases", () => {
    const sample = planBuiltInAi50000Phase3DangerousSafetySample();
    expect(sample).toHaveLength(50);
    expect(sample.every((item) => item.dangerousWork)).toBe(true);
  });
});
