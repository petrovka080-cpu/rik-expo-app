import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("AI recognition never becomes a final fact", () => {
  const analysis = createDeterministicMediaAiAnalysis({ asset: mediaAsset(), analyzedAt: "2026-05-21T00:00:00.000Z" });
  expect(analysis.finalFact).toBe(false);
  expect(analysis.constructionSuggestion?.mustReview).toBe(true);
});
