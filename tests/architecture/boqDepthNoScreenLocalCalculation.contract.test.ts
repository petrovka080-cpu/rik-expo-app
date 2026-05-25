import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("BOQ depth no screen-local calculation", () => {
  it("keeps formula and depth calculations in the global estimate backend layer", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const formulaValidator = readFile("src/lib/ai/globalEstimate/estimateFormulaQualityValidator.ts");
    const formulaEngine = readFile("src/lib/ai/globalEstimate/estimateFormulaQualityEngine.ts");
    const depthValidator = readFile("src/lib/ai/globalEstimate/validateEstimateBoqDepth.ts");

    expect(formulaEngine).toContain("length * width * height");
    expect(formulaValidator).toContain("FORMULA_STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
    expect(depthValidator).toContain("minimumRowsForEstimate");
    expect(screen).not.toContain("length * width * height");
    expect(screen).not.toContain("minimumRowsForEstimate");
    expect(screen).not.toContain("validateProfessionalEstimateFormulaQuality");
  });
});
