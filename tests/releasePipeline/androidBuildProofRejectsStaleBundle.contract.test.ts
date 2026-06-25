import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 build proof stale bundle guard", () => {
  it("forces release bundle regeneration and rejects candidate identity mismatches", () => {
    expectFileToContain("scripts/release/android/shared.ts", "\"--rerun-tasks\", \"assembleRelease\"");
    expectFileToContain("scripts/release/android/shared.ts", "releaseBundleContainsCurrentIdentity");
    expectFileToContain("scripts/release/android/shared.ts", "bundle.includes(candidate.candidateHash)");
    expectFileToContain("scripts/release/android/shared.ts", "bundle.includes(candidate.productSourceHash)");
    expectFileToContain("scripts/release/android/shared.ts", "delete env.CI");
    expectFileToContain("scripts/release/android/shared.ts", "Expo export:embed disables --reset-cache when CI is set");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "EMBEDDED_JS_BUNDLE_IDENTITY_MISMATCH");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "android_apk_embedded_identity_matches");
  });
});
