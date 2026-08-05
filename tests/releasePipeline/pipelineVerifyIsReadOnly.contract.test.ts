import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("release pipeline verify read-only contract", () => {
  it("checks status and tracked hashes before and after verification", () => {
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "trackedFileHashes()");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "VERIFY_MUTATED_WORKTREE");
    expectFileNotToMatch("scripts/release/runReleasePipelineVerify.ts", /assembleRelease|adbPath|install",\s*"-r"|artifacts\/S_RELEASE_PIPELINE_RECOVERY/);
  });

  it("accepts the canonical read-only API34 verifier only with exact fingerprints", () => {
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", 'releaseRecoveryArtifactPath("android_verify.json")');
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", '"GREEN_ANDROID_API34_VERIFY_READY"');
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.source_tree_hash === fingerprints.sourceTreeHash");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.native_build_fingerprint === fingerprints.nativeBuildFingerprint");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.js_bundle_fingerprint === fingerprints.jsBundleFingerprint");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.proof_harness_fingerprint === fingerprints.proofHarnessFingerprint");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.android_actual_api === 34");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "value.android_verify_read_only === true");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "androidCandidates.find((value) => isGreenAndroid(value, fingerprints))");
  });
});
