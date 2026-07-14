import { expectFileToContain } from "./releasePipelineContractUtils";

describe("product proof evidence candidate binding", () => {
  it("binds product proof runtime reports to candidate hash, source head, and fingerprints", () => {
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "candidateHash: params.candidate.candidateHash");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "sourceHead: params.candidate.source_commit");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "productSourceHash: params.candidate.productSourceHash");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "proofHarnessHash: params.candidate.proofHarnessHash");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "nativeBuildHash: params.candidate.nativeBuildHash");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "PRODUCT_PROOF_FUNCTIONAL_STATUS_NOT_GREEN");
  });
});
