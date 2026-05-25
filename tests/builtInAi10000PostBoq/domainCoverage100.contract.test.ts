import {
  BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY,
  BUILT_IN_AI_10000_POST_BOQ_DOMAINS,
  BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS,
} from "../../src/lib/ai/builtInAi10000";

describe("built-in AI 10000 post-BOQ domain coverage", () => {
  it("covers exactly the required 100 domains with 100 cases each", () => {
    expect(BUILT_IN_AI_10000_POST_BOQ_DOMAINS).toHaveLength(100);
    expect(Object.keys(BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY)).toHaveLength(100);
    expect(BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS).toHaveLength(100);
    for (const domainId of BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS) {
      expect(BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY[domainId]).toBe(100);
    }
  });
});
