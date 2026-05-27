import { buildAiEstimatePdfSourceFromGlobalEstimate } from "../../src/lib/ai/estimatePdf";
import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate PDF source", () => {
  it("uses GlobalEstimateResult as structured source of truth", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing);
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate);

    expect(source.sourceType).toBe("global_estimate_result");
    expect(source.structuredEstimate).toBe(estimate);
    expect(source.estimate.sections.length).toBeGreaterThan(0);
  });
});
