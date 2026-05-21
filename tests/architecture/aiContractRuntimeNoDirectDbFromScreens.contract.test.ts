import { scanAiContractRuntimePatchPatterns } from "../../src/lib/ai/contractRuntime";

describe("AI contract runtime no direct DB from screens", () => {
  it("does not introduce direct DB/provider calls in AI screen proof scope", () => {
    expect(scanAiContractRuntimePatchPatterns().directDbFromScreensFound).toBe(0);
  });
});
