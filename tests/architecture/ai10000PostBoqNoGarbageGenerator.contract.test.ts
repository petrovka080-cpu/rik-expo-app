import {
  BUILT_IN_AI_10000_POST_BOQ_CASES,
  BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY,
  BUILT_IN_AI_10000_POST_BOQ_DOMAINS,
} from "../../src/lib/ai/builtInAi10000";

describe("AI 10000 post-BOQ architecture: no garbage generator", () => {
  it("uses exact domain coverage instead of count-only prompt spam", () => {
    expect(BUILT_IN_AI_10000_POST_BOQ_DOMAINS).toHaveLength(100);
    expect(BUILT_IN_AI_10000_POST_BOQ_CASES).toHaveLength(10000);
    expect(Object.values(BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY).every((count) => count === 100)).toBe(true);
    expect(BUILT_IN_AI_10000_POST_BOQ_CASES.every((testCase) => testCase.domainId && testCase.workFamily && testCase.expectedTool)).toBe(true);
  });
});
