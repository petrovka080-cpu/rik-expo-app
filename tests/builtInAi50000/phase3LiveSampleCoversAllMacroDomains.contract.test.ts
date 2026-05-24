import {
  planBuiltInAi50000Phase3AndroidDomainSample,
  planBuiltInAi50000Phase3WebDomainSample,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 macro-domain coverage", () => {
  it("covers all 25 macro domains on web and Android", () => {
    expect(new Set(planBuiltInAi50000Phase3WebDomainSample().map((item) => item.macroDomainId)).size).toBe(25);
    expect(new Set(planBuiltInAi50000Phase3AndroidDomainSample().map((item) => item.macroDomainId)).size).toBe(25);
  });
});
