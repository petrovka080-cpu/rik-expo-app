import { validateBuiltInAi50000RuntimeResult, BUILT_IN_AI_50000_FULL_CASES } from "../../src/lib/ai/builtInAi50000";
import type { BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";

describe("built-in AI 50000 Phase 2 shard runner source guard", () => {
  it("fails an estimate result when priced rows have no source evidence", () => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.intent === "estimate")!;
    const answer = {
      route: { intent: "estimate" },
      runtimeTrace: { traceId: "missing-source-test" },
      toolResult: {
        toolName: "calculate_global_estimate",
        backendCalled: true,
        estimate: {
          work: { workKey: testCase.workKey, category: testCase.category },
          sections: [
            { type: "materials", rows: [{ quantity: 1, displayQuantity: "1", unitPrice: 1, sourceEvidence: [] }] },
            { type: "labor", rows: [{ quantity: 1, displayQuantity: "1", unitPrice: 1, sourceEvidence: [] }] },
          ],
          totals: { grandTotal: 2 },
          outputContract: { hasTaxStatus: true },
          costIncreaseFactors: ["scope"],
          clarifyingQuestions: ["location?"],
        },
      },
      actions: [{ id: "make_pdf", visible: true }],
      answerTextRu: "ok",
    } as unknown as BuiltInAiAnswer;
    expect(validateBuiltInAi50000RuntimeResult(testCase, answer).failureCodes).toContain("SOURCE_EVIDENCE_MISSING");
  });
});
