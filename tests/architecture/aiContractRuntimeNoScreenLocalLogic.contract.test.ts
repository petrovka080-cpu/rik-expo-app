import { scanAiContractRuntimePatchPatterns } from "../../src/lib/ai/contractRuntime";

describe("AI contract runtime no screen-local logic", () => {
  it("keeps screen-local symptom patches out of the proof scope", () => {
    const scan = scanAiContractRuntimePatchPatterns();
    expect(scan.symptomPatchesFound).toBe(0);
    expect(scan.directDbFromScreensFound).toBe(0);
  });
});
