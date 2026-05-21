import { buildMediaCachePolicy } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("original media is not prefetched", () => {
  const policy = buildMediaCachePolicy({ asset: mediaAsset(), variant: "original" });
  expect(policy.allowOriginalPrefetch).toBe(false);
  expect(policy.allowPrefetch).toBe(false);
});
