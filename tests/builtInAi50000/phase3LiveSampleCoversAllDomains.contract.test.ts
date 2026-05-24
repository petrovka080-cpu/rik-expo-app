import { planBuiltInAi50000Phase3WebDomainSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 domain coverage", () => {
  it("represents all 500 domains on web", () => {
    const sample = planBuiltInAi50000Phase3WebDomainSample();
    expect(new Set(sample.map((item) => item.domainId)).size).toBe(500);
  });
});
