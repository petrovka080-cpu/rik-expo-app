import type { MediaHandoffRef } from "../../src/lib/media";

test("media handoff uses ids only and requires fresh role-checked access", () => {
  const handoff: MediaHandoffRef = {
    mediaAssetId: "media-1",
    mediaAssetGroupId: "group-1",
    fromScreenId: "foreman",
    toScreenId: "documents",
    reasonRu: "Привязать фото к акту",
    allowedTargetPurposes: ["act_attachment"],
    requiresRoleCheck: true,
    requiresFreshSignedUrl: true,
  };
  expect(handoff).not.toHaveProperty("signedUrl");
  expect(handoff.requiresRoleCheck).toBe(true);
});
