import { createDeterministicMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("warehouse media quantity guess is not a stock fact", () => {
  const analysis = createDeterministicMediaAiAnalysis({
    asset: mediaAsset({ purpose: "warehouse_discrepancy", workId: undefined }),
    analyzedAt: "2026-05-21T00:00:00.000Z",
  });
  expect(analysis.warehouseSuggestion?.quantityIsFact).toBe(false);
  expect(analysis.warehouseSuggestion?.mustReview).toBe(true);
});
