import type { BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_50000_FULL_CASES, validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 shard runner stock guard", () => {
  it("fails product results that pretend stock is known", () => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.intent === "product_search")!;
    const answer = {
      route: { intent: "product_search" },
      runtimeTrace: { traceId: "fake-stock-test" },
      toolResult: {
        toolName: "search_material_products",
        backendCalled: true,
        productSearch: {
          candidates: [{ sourceEvidence: [{ sourceId: "catalog" }], stockKnown: true, availabilityStatus: "unknown" }],
        },
      },
      actions: [],
      answerTextRu: "ok",
    } as unknown as BuiltInAiAnswer;
    const result = validateBuiltInAi50000RuntimeResult(testCase, answer);
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("FAKE_STOCK_FOUND");
  });
});
