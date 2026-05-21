import { mediaAsset } from "./mediaTestFixtures";

test("media asset is draft, private, and review-safe by default", () => {
  const asset = mediaAsset();
  expect(asset.moderationStatus).toBe("draft");
  expect(asset.finalLinkedByHuman).toBe(false);
  expect(asset.visibility.requiresSignedUrl).toBe(true);
  expect(asset.safety.faceIdentificationAttempted).toBe(false);
});
