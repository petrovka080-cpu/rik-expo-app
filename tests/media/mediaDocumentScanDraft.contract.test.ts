import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("document scan analysis suggests link, not final link", () => {
  const analysis = createDeterministicMediaAiAnalysis({
    asset: mediaAsset({ purpose: "document_scan", workId: undefined }),
    analyzedAt: "2026-05-21T00:00:00.000Z",
  });
  expect(analysis.documentSuggestion?.mustReview).toBe(true);
  expect(analysis.finalFact).toBe(false);
});
