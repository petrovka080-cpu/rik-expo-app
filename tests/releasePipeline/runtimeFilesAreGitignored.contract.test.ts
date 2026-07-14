import { expectFileToContain } from "./releasePipelineContractUtils";

describe("release runtime files", () => {
  it("keeps mutable execution output ignored by git", () => {
    expectFileToContain(".gitignore", ".release-runtime/");
    expectFileToContain("scripts/release/computeReleaseFingerprints.ts", "RELEASE_PIPELINE_RUNTIME_ROOT");
  });
});
