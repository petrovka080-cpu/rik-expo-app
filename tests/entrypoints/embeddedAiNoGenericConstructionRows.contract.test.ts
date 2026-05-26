import {
  EMBEDDED_AI_PROMPTS,
  estimateForEmbeddedAi,
  expectNoGenericKnownWorkRows,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("embedded AI generic rows block", () => {
  it("does not return generic construction rows for P0 known work", () => {
    for (const prompt of Object.values(EMBEDDED_AI_PROMPTS)) {
      expectNoGenericKnownWorkRows(presentationForEstimate(estimateForEmbeddedAi(prompt)));
    }
  });
});
