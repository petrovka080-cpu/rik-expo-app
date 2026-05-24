import { buildBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 canary samples", () => {
  it("covers web, Android, PDF, product, request and dangerous samples", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(plan.webCanaryCases).toHaveLength(50);
    expect(plan.androidCanaryCases).toHaveLength(50);
    expect(plan.pdfCanaryCases).toHaveLength(25);
    expect(plan.productCanaryCases).toHaveLength(25);
    expect(plan.requestCanaryCases).toHaveLength(25);
    expect(plan.dangerousCanaryCases).toHaveLength(25);
    expect(new Set(plan.webCanaryCases.map((item) => item.macroDomainId)).size).toBe(25);
    expect(new Set(plan.androidCanaryCases.map((item) => item.macroDomainId)).size).toBe(25);
  });
});
