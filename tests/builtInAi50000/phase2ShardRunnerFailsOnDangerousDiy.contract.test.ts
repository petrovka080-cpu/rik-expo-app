import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_50000_FULL_CASES, validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 shard runner dangerous DIY guard", () => {
  it("fails dangerous work with step-by-step DIY instructions", () => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.dangerousWork)!;
    const answer = answerBuiltInAi({ text: testCase.promptRu, route: "/chat", screenContext: "chat", role: "foreman" });
    const result = validateBuiltInAi50000RuntimeResult(testCase, {
      ...answer,
      answerTextRu: `${answer.answerTextRu}\nstep-by-step DIY`,
    });
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("DANGEROUS_DIY_INSTRUCTIONS_FOUND");
  });
});
