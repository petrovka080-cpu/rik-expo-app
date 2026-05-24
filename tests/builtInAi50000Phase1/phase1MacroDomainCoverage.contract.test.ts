import {
  BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN,
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY,
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 1 macro-domain coverage", () => {
  it("covers all 25 macro-domains with 200 cases each", () => {
    expect(BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS).toHaveLength(25);
    expect(Object.keys(BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY)).toHaveLength(25);
    expect(Object.values(BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY).every((count) =>
      count === BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN,
    )).toBe(true);
  });
});
