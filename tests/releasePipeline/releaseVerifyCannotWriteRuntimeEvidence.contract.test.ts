import { expectFileToContain } from "./releasePipelineContractUtils";

describe("release verify runtime evidence strictness", () => {
  it("fails when candidate runtime evidence changes during general verify", () => {
    expectFileToContain("scripts/release/releasePipelineRuntime.ts", "candidateRuntimeEvidenceHashes");
    expectFileToContain("scripts/release/releasePipelineRuntime.ts", "runtimeEvidenceHashes");
    expectFileToContain("scripts/release/releasePipelineRuntime.ts", "VERIFY_MUTATED_RUNTIME_EVIDENCE");
    expectFileToContain("scripts/release/run-release-guard.ts", "diffReleaseVerifyStrictSnapshots");
  });
});
