import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("field media evidence requires human review", () => {
  const analysis = createDeterministicMediaAiAnalysis({ asset: mediaAsset({ purpose: "after_photo" }), analyzedAt: "2026-05-21T00:00:00.000Z" });
  expect(analysis.constructionSuggestion?.evidenceType).toBe("after");
  expect(analysis.finalFact).toBe(false);
});
