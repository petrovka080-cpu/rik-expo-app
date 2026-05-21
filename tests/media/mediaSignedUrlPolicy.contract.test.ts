import { buildMediaSignedUrlPolicy } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("signed URL policy never allows logging URL or storage key", () => {
  const policy = buildMediaSignedUrlPolicy({
    asset: mediaAsset(),
    variant: "preview",
    requesterUserId: "foreman-1",
    requesterRole: "foreman",
    orgId: "org-1",
  });
  expect(policy.canIssue).toBe(true);
  expect(policy.logSafe).toEqual({ canLogUrl: false, canLogStorageKey: false, canLogAssetId: true });
});
