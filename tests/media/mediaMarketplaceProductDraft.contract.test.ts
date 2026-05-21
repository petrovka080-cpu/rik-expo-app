import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("marketplace media produces product draft, not publication", () => {
  const analysis = createDeterministicMediaAiAnalysis({
    asset: mediaAsset({ purpose: "product_photo", workId: undefined }),
    analyzedAt: "2026-05-21T00:00:00.000Z",
  });
  expect(analysis.productSuggestion?.mustReview).toBe(true);
  expect(analysis.productSuggestion?.missingData).toContain("price");
});
