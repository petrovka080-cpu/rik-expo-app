import { computeReleaseFingerprints } from "./computeReleaseFingerprints";
import {
  loadReleaseCandidate,
  listSourceWorktreeChanges,
} from "./releaseCandidateState";
import {
  candidateRuntimeDir,
  gitStatusSnapshot,
  hasSameJson,
  readJsonObjectIfExists,
  releaseRecoveryArtifactPath,
  releaseRuntimeIsGitignored,
  trackedFileHashes,
  writeJsonFile,
} from "./releasePipelineRuntime";

function isGreenFullJest(value: Record<string, unknown> | null): boolean {
  return value?.passed === true || value?.success === true || value?.final_status === "GREEN_FULL_JEST_FROZEN_PASSED";
}

function isGreenAndroid(
  value: Record<string, unknown> | null,
  fingerprints: ReturnType<typeof computeReleaseFingerprints>,
): boolean {
  if (value?.final_status === "GREEN_ANDROID_API34_PIPELINE_READY") {
    return value.candidate_hash === fingerprints.candidateHash;
  }

  return (
    value?.final_status === "GREEN_ANDROID_API34_VERIFY_READY" &&
    value.source_tree_hash === fingerprints.sourceTreeHash &&
    value.native_build_fingerprint === fingerprints.nativeBuildFingerprint &&
    value.js_bundle_fingerprint === fingerprints.jsBundleFingerprint &&
    value.proof_harness_fingerprint === fingerprints.proofHarnessFingerprint &&
    value.android_actual_api === 34 &&
    value.api36_used_as_substitute === false &&
    value.android_verify_read_only === true &&
    value.fake_green_claimed === false &&
    Array.isArray(value.failures) &&
    value.failures.length === 0
  );
}

function main(): void {
  const statusBefore = gitStatusSnapshot();
  const hashesBefore = trackedFileHashes();
  const failures: string[] = [];
  const executionOutputGitignored = releaseRuntimeIsGitignored();
  if (!executionOutputGitignored) failures.push("RELEASE_RUNTIME_NOT_GITIGNORED");

  let candidate: ReturnType<typeof loadReleaseCandidate> | null = null;
  try {
    candidate = loadReleaseCandidate();
  } catch {
    candidate = null;
  }
  const promotedCandidate = readJsonObjectIfExists(releaseRecoveryArtifactPath("candidate.json"));
  if (!candidate && !promotedCandidate) failures.push("RELEASE_CANDIDATE_MISSING");

  const fingerprints = computeReleaseFingerprints();
  if (!fingerprints.productSourceHash) failures.push("PRODUCT_SOURCE_HASH_MISSING");
  if (!fingerprints.proofHarnessHash) failures.push("PROOF_HARNESS_HASH_MISSING");
  if (!fingerprints.nativeBuildHash) failures.push("NATIVE_BUILD_HASH_MISSING");
  if (!fingerprints.candidateHash) failures.push("CANDIDATE_HASH_MISSING");
  if (!fingerprints.apkBuildKey) failures.push("APK_BUILD_KEY_MISSING");

  const candidateForComparison = candidate ?? promotedCandidate;
  if (candidateForComparison) {
    if (candidateForComparison.productSourceHash !== fingerprints.productSourceHash) failures.push("PRODUCT_SOURCE_HASH_MISMATCH");
    if (candidateForComparison.proofHarnessHash !== fingerprints.proofHarnessHash) failures.push("PROOF_HARNESS_HASH_MISMATCH");
    if (candidateForComparison.nativeBuildHash !== fingerprints.nativeBuildHash) failures.push("NATIVE_BUILD_HASH_MISMATCH");
    if (candidateForComparison.candidateHash !== fingerprints.candidateHash) failures.push("CANDIDATE_HASH_MISMATCH");
    if (candidateForComparison.apkBuildKey !== fingerprints.apkBuildKey) failures.push("APK_BUILD_KEY_MISMATCH");
  }
  if (candidate) {
    if (listSourceWorktreeChanges().length > 0) failures.push("SOURCE_WORKTREE_DIRTY");
  }

  const runtimeDir = candidate ? candidateRuntimeDir(candidate) : "";
  const runtimeFullJest = runtimeDir ? readJsonObjectIfExists(`${runtimeDir}/full-jest/result.json`) : null;
  const runtimeAndroid = runtimeDir ? readJsonObjectIfExists(`${runtimeDir}/android/verify.json`) : null;
  const promotedFullJest = readJsonObjectIfExists(releaseRecoveryArtifactPath("full_jest_summary.json"));
  const promotedAndroid = readJsonObjectIfExists(releaseRecoveryArtifactPath("android_api34_pipeline.json"));
  const canonicalApi34Android = readJsonObjectIfExists(releaseRecoveryArtifactPath("android_verify.json"));
  const fullJest = runtimeFullJest ?? promotedFullJest;
  const androidCandidates = [runtimeAndroid, promotedAndroid, canonicalApi34Android];
  const android =
    androidCandidates.find((value) => isGreenAndroid(value, fingerprints)) ??
    androidCandidates.find((value) => value !== null) ??
    null;

  if (!isGreenFullJest(fullJest)) failures.push("FULL_JEST_PROOF_MISSING_OR_NOT_GREEN");
  if (!isGreenAndroid(android, fingerprints)) failures.push("ANDROID_PIPELINE_PROOF_MISSING_OR_NOT_GREEN");

  const statusAfterChecks = gitStatusSnapshot();
  const hashesAfterChecks = trackedFileHashes();
  if (statusBefore !== statusAfterChecks || !hasSameJson(hashesBefore, hashesAfterChecks)) {
    failures.push("VERIFY_MUTATED_WORKTREE");
  }

  const passed = failures.length === 0;
  const report = {
    final_status: passed
      ? "GREEN_RELEASE_PIPELINE_VERIFY_READ_ONLY"
      : "BLOCKED_RELEASE_PIPELINE_VERIFY",
    release_pipeline_verify_read_only: !failures.includes("VERIFY_MUTATED_WORKTREE"),
    release_pipeline_verify_passed: passed,
    execution_output_gitignored: executionOutputGitignored,
    tracked_files_modified_by_execution: failures.includes("VERIFY_MUTATED_WORKTREE") ? 1 : 0,
    product_source_hash_present: Boolean(fingerprints.productSourceHash),
    proof_harness_hash_present: Boolean(fingerprints.proofHarnessHash),
    native_build_hash_present: Boolean(fingerprints.nativeBuildHash),
    candidate_hash_present: Boolean(fingerprints.candidateHash),
    full_jest_passed: isGreenFullJest(fullJest),
    android_actual_api: android?.android_actual_api ?? null,
    android_uses_dev_client: android?.android_uses_dev_client ?? null,
    android_uses_metro: android?.android_uses_metro ?? null,
    android_apk_contains_embedded_bundle: android?.android_apk_contains_embedded_bundle ?? null,
    android_build_identity_matches: android?.android_build_identity_matches ?? null,
    failures,
    fake_green_claimed: false,
  };

  if (candidate) {
    writeJsonFile(`${candidateRuntimeDir(candidate)}/pipeline_verify.json`, report);
  }

  const statusAfterWrite = gitStatusSnapshot();
  const hashesAfterWrite = trackedFileHashes();
  if (statusBefore !== statusAfterWrite || !hasSameJson(hashesBefore, hashesAfterWrite)) {
    report.final_status = "BLOCKED_RELEASE_PIPELINE_VERIFY";
    report.release_pipeline_verify_read_only = false;
    report.release_pipeline_verify_passed = false;
    report.tracked_files_modified_by_execution = 1;
    report.failures.push("VERIFY_MUTATED_WORKTREE_AFTER_RUNTIME_WRITE");
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.final_status !== "GREEN_RELEASE_PIPELINE_VERIFY_READ_ONLY") process.exit(1);
}

main();
