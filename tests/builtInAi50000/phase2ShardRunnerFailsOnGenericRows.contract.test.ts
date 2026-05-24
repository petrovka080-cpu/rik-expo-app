import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_50000_FULL_CASES, validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 shard runner generic row guard", () => {
  it("fails when generic construction rows appear in the answer", () => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.intent === "estimate")!;
    const answer = answerBuiltInAi({ text: testCase.promptRu, route: "/chat", screenContext: "chat", role: "foreman" });
    const result = validateBuiltInAi50000RuntimeResult(testCase, {
      ...answer,
      answerTextRu: `${answer.answerTextRu}\ngeneric_construction_work_row`,
    });
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("FORBIDDEN_FALLBACK_ROW_FOUND");
  });
});
