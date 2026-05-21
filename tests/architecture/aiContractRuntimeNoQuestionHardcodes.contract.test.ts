import { scanAiContractRuntimePatchPatterns } from "../../src/lib/ai/contractRuntime";

describe("AI contract runtime no question hardcodes", () => {
  it("does not hardcode production answers by question, screen, or button ids", () => {
    const scan = scanAiContractRuntimePatchPatterns();
    expect(scan.questionIdHardcodesFound).toBe(0);
    expect(scan.screenIdAnswerHardcodesFound).toBe(0);
    expect(scan.buttonIdAnswerHardcodesFound).toBe(0);
  });
});
