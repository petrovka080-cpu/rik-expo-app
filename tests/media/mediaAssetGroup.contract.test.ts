import { createDraftMediaAssetGroup, mediaAssetGroupUsesCentralLimits } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("media group uses central limits", () => {
  const group = createDraftMediaAssetGroup({
    id: "group-1",
    orgId: "org-1",
    ownerUserId: "u-1",
    ownerRole: "foreman",
    purpose: "work_evidence",
    assets: [mediaAsset()],
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  expect(mediaAssetGroupUsesCentralLimits(group)).toBe(true);
  expect(group.status).toBe("draft");
});
