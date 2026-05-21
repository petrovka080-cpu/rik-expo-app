import {
  invariantNoHardcodedEvalAnswers,
  scanAiContractRuntimePatchPatterns,
} from "../../../src/lib/ai/contractRuntime";

describe("invariant no hardcoded eval answers", () => {
  it("fails question/screen/button answer hardcodes", () => {
    const clean = scanAiContractRuntimePatchPatterns({
      inlineSources: [{ file: "src/lib/ai/contractRuntime/clean.ts", text: "export const ok = true;" }],
    });
    expect(invariantNoHardcodedEvalAnswers(clean).passed).toBe(true);

    const dirty = scanAiContractRuntimePatchPatterns({
      inlineSources: [{ file: "src/features/ai/dirty.ts", text: "const bad = questionId === 'q1' ? 'answer' : '';" }],
    });
    expect(invariantNoHardcodedEvalAnswers(dirty).passed).toBe(false);
  });
});
