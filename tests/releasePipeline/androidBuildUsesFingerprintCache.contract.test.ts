import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 build cache", () => {
  it("keys cached APKs by native and JS fingerprints", () => {
    expectFileToContain("scripts/release/android/buildProofApk.ts", ".cache");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "apkBuildKey");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "nativeBuildHash");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "cache_hit");
  });
});
