import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 build cache", () => {
  it("keys cached APKs by native and JS fingerprints", () => {
    expectFileToContain("scripts/e2e/androidApi34BuildIfNeeded.ts", ".cache");
    expectFileToContain("scripts/e2e/androidApi34BuildIfNeeded.ts", "nativeBuildFingerprint");
    expectFileToContain("scripts/e2e/androidApi34BuildIfNeeded.ts", "jsBundleFingerprint");
    expectFileToContain("scripts/e2e/androidApi34BuildIfNeeded.ts", "cache_hit");
  });
});
