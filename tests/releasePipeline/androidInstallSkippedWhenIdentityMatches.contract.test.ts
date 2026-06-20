import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 install cache", () => {
  it("skips reinstall when build identity already matches", () => {
    expectFileToContain("scripts/release/android/installProofApk.ts", "INSTALL_SKIPPED_BUILD_IDENTITY_MATCHED");
    expectFileToContain("scripts/release/android/installProofApk.ts", "install_skipped_build_identity_matched");
  });
});
