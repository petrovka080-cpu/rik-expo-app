import { hasRequiredMediaVariants } from "../../src/lib/media";
import { mediaProof } from "./mediaTestFixtures";

test("photo thumbnails and video posters are generated as variant refs", () => {
  const proof = mediaProof();
  expect(hasRequiredMediaVariants({ mediaKind: "photo", variants: proof.asset.variants })).toBe(true);
  expect(hasRequiredMediaVariants({ mediaKind: "video", variants: proof.videoAsset.variants })).toBe(true);
});
