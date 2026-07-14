import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("photo material existing row runtime proof", () => {
  it("writes proof execution output only to ignored release runtime", () => {
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", ".release-runtime");
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", "feature\", \"photo-existing-row");
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", "writePhotoRuntimeJson");
    expectFileNotToMatch("scripts/release/runPhotoMaterialExistingRowProof.ts", /artifacts[\\/]+S_AI_ESTIMATE_PHOTO_MATERIAL_EXISTING_ROW/);
  });

  it("binds source gates to the single source commit parent", () => {
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", "source_head_before_commit");
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", "BLOCKED_PHOTO_SOURCE_GATES_NOT_BOUND_TO_SOURCE_COMMIT_PARENT");
    expectFileToContain("scripts/release/runPhotoMaterialExistingRowProof.ts", "BLOCKED_PHOTO_SOURCE_GATE_PATHS_DO_NOT_MATCH_SOURCE_COMMIT");
  });
});
