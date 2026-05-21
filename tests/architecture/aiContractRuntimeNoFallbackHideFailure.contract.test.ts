import { scanAiContractRuntimePatchPatterns } from "../../src/lib/ai/contractRuntime";

describe("AI contract runtime no fallback hide failure", () => {
  it("does not hide invariant failures behind fallback text", () => {
    expect(scanAiContractRuntimePatchPatterns().fallbackHideFailureFound).toBe(0);
  });
});
