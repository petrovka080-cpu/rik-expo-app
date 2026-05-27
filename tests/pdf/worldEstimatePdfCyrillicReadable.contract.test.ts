import { buildWorldEngineEstimate, expectPresentationAndPdf, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate PDF Cyrillic", () => {
  it("keeps Cyrillic text readable in the generated PDF proof", () => {
    expectPresentationAndPdf(buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing));
  });
});
