import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("BOQ depth is not a foundation-only patch", () => {
  it("validates multiple complex categories through shared backend validators", () => {
    const policy = readFile("src/lib/ai/globalEstimate/estimateBoqDepthPolicy.ts");
    const validator = readFile("src/lib/ai/globalEstimate/estimateFormulaQualityValidator.ts");

    expect(policy).toContain("foundation");
    expect(policy).toContain("roofing");
    expect(policy).toContain("roadworks");
    expect(policy).toContain("masonry");
    expect(policy).toContain("tile");
    expect(policy).toContain("energy_infrastructure");

    expect(validator).toContain('result.work.category === "roofing"');
    expect(validator).toContain('result.work.category === "tile"');
    expect(validator).toContain('result.work.category === "roadworks"');
  });
});
