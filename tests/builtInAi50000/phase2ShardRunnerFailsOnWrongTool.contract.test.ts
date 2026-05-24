import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_50000_FULL_CASES, validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 shard runner wrong tool guard", () => {
  it("fails a case when the expected tool is wrong", () => {
    const testCase = { ...BUILT_IN_AI_50000_FULL_CASES.find((item) => item.intent === "estimate")!, expectedTool: "search_material_products" as const };
    const answer = answerBuiltInAi({ text: testCase.promptRu, route: "/chat", screenContext: "chat", role: "foreman" });
    const result = validateBuiltInAi50000RuntimeResult(testCase, answer);
    expect(result.passed).toBe(false);
    expect(result.failureCodes.some((code) => code.startsWith("EXPECTED_TOOL_MISMATCH"))).toBe(true);
  });
});
