import { buildWorldEngineEstimate, expectPresentationAndPdf, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate PDF table", () => {
  it("creates a professional table-backed PDF for world estimates", () => {
    expectPresentationAndPdf(buildWorldEngineEstimate(WORLD_PROMPTS.brick));
  });
});
