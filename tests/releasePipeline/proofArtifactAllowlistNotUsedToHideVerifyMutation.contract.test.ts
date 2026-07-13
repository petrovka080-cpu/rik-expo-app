import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("proof artifact allowlist cannot hide release verify mutation", () => {
  it("keeps proof artifact allowlists out of release verify dirty-scope enforcement", () => {
    expectFileNotToContain("scripts/release/releaseVerifyDirtyScope.ts", "proofArtifactAllowlist");
    expectFileNotToContain("scripts/release/releaseVerifyDirtyScope.ts", "isAllowedProofArtifactPath");
    expectFileToContain("scripts/release/releaseVerifyDirtyScope.ts", "return false");
    expectFileNotToContain("scripts/release/proofArtifactAllowlist.ts", "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_");
    expectFileNotToContain("scripts/release/proofArtifactAllowlist.ts", "S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_");
    expectFileNotToContain("scripts/release/proofArtifactAllowlist.ts", "S_REQUEST_AI_ESTIMATE_BOQ_FORMULA_");
  });
});
