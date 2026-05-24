import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate formula quality no screen-local calculation", () => {
  it("keeps strip foundation formulas in global estimate backend modules", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const formulaEngine = readFile("src/lib/ai/globalEstimate/estimateFormulaQualityEngine.ts");
    const calculator = readFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");

    expect(formulaEngine).toContain("length * width * height");
    expect(calculator).toContain("buildStripFoundationQuantityContext");
    expect(screen).not.toContain("length * width * height");
    expect(screen).not.toContain("strip_foundation_concrete_volume_m3");
    expect(screen).not.toContain("32.64");
  });
});
