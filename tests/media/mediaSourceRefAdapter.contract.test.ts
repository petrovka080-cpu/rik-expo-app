import { createMediaAssetSourceRef } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("media source ref is clickable but review-gated", () => {
  const ref = createMediaAssetSourceRef({ asset: mediaAsset(), canOpen: true });
  expect(ref.origin).toBe("media_asset");
  expect(ref.appLink.params.mediaAssetId).toBe("media-gkl-progress-1");
  expect(ref.requiresReview).toBe(true);
});
