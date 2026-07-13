import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("photo material existing row promotion", () => {
  it("keeps the photo closeout tracked writer inside the promotion script", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "--photo-material-existing-row");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "S_AI_ESTIMATE_PHOTO_MATERIAL_EXISTING_ROW");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PHOTO_MATERIAL_EXISTING_ROW_REQUIRED_FILES");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "BLOCKED_PHOTO_MATERIAL_EXISTING_ROW_PROMOTION_NOT_READY");
  });

  it("rejects partial or unsafe photo proof before promotion", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PHOTO_SECRET_SCAN_MISSING");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PHOTO_ANDROID_ACTUAL_API_NOT_34");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "PHOTO_RELEASE_VERIFY_NOT_GREEN");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "FORBIDDEN_PHOTO_ARTIFACT_CONTENT");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "raw_photos");
  });
});
