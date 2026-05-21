import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("AI media analysis is a suggestion with human confirmation links", () => {
  const analysis = createDeterministicMediaAiAnalysis({ asset: mediaAsset(), analyzedAt: "2026-05-21T00:00:00.000Z" });
  expect(analysis.finalFact).toBe(false);
  expect(analysis.suggestedLinks[0]?.requiresHumanConfirm).toBe(true);
});
