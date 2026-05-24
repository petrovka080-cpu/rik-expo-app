import type { BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_50000_FULL_CASES, validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 shard runner stock guard", () => {
  it("fails product results that pretend stock is known", () => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.intent === "product_search")!;
    const answer: BuiltInAiAnswer = {
      handled: true,
      route: {
        originalText: testCase.promptRu,
        screenContext: "chat",
        intent: "product_search",
        confidence: "high",
        mustUseBackendTool: true,
        allowedTools: ["search_material_products"],
        forbiddenFallbacks: testCase.forbiddenRowsContain,
        traceId: "fake-stock-test",
        workKey: testCase.workKey,
        category: testCase.category,
      },
      runtimeTrace: {
        traceId: "fake-stock-test",
        input: testCase.promptRu,
        screenContext: "chat",
        detectedIntent: "product_search",
        selectedRoute: "product_search",
        selectedTool: "search_material_products",
        workKey: testCase.workKey,
        category: testCase.category,
        backendCalled: true,
        outputContract: {
          hasTable: true,
          hasMaterials: false,
          hasLabor: false,
          hasSources: true,
          hasPdfAction: false,
        },
      },
      toolResult: {
        toolName: "search_material_products",
        backendCalled: true,
        productSearch: {
          query: testCase.promptRu,
          category: testCase.category,
          sourceBacked: true,
          fakeStockOrAvailabilityFound: true,
          candidates: [
            {
              id: "fake-stock-candidate",
              title: testCase.productSearch?.expectedProductFamily ?? "Материал",
              category: testCase.category,
              neededQuantity: 1,
              unit: testCase.unit ?? "шт",
              unitPrice: null,
              currency: "KGS",
              sourceEvidence: [
                {
                  sourceId: "catalog",
                  sourceType: "configured_reference",
                  label: "catalog",
                  checkedAt: "2026-05-24T00:00:00.000Z",
                  freshness: "fresh",
                  confidence: "high",
                },
              ],
              stockKnown: true,
              availabilityStatus: "unknown",
            },
          ],
        },
      },
      actions: [],
      answerTextRu: "ok",
    };
    const result = validateBuiltInAi50000RuntimeResult(testCase, answer);
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("FAKE_STOCK_FOUND");
  });
});
