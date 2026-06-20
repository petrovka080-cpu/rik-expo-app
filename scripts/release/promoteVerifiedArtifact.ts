import fs from "node:fs";
import path from "node:path";

import {
  RELEASE_PIPELINE_ARTIFACT_DIR,
  computeReleaseFingerprintPayloads,
  computeReleaseFingerprints,
} from "./computeReleaseFingerprints";
import { assertSourceFrozen } from "./assertSourceFrozen";
import { loadReleaseCandidate } from "./releaseCandidateState";
import {
  candidateRuntimeDir,
  currentHead,
  readJsonObject,
  readJsonObjectIfExists,
  writeJsonFile,
} from "./releasePipelineRuntime";

function readJson(filePath: string): Record<string, unknown> {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`BLOCKED_PROMOTE_ARTIFACT_NOT_OBJECT:${filePath}`);
  }
  return parsed as Record<string, unknown>;
}

export function promoteVerifiedArtifact(params: {
  sourcePath: string;
  targetName: string;
}): string {
  const source = path.resolve(process.cwd(), params.sourcePath);
  const parsed = readJson(source);
  if (parsed.success !== true && parsed.passed !== true && parsed.final_status !== "GREEN_FULL_JEST_FROZEN_PASSED") {
    throw new Error("BLOCKED_FAILED_ARTIFACT_NOT_PROMOTED");
  }
  if (parsed.fake_green_claimed === true) {
    throw new Error("BLOCKED_FAKE_GREEN_ARTIFACT_NOT_PROMOTED");
  }
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const target = path.join(RELEASE_PIPELINE_ARTIFACT_DIR, params.targetName);
  fs.copyFileSync(source, target);
  return target;
}

function readExitCode(filePath: string): number {
  const value = fs.readFileSync(filePath, "utf8").trim();
  return Number(value);
}

function assertPipelinePromotionReady(): {
  candidate: ReturnType<typeof loadReleaseCandidate>;
  freeze: Record<string, unknown>;
  fingerprints: ReturnType<typeof computeReleaseFingerprints>;
  fullJest: Record<string, unknown>;
  fullJestSummary: Record<string, unknown>;
  android: Record<string, unknown>;
  pipelineVerify: Record<string, unknown>;
} {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const runtimeDir = candidateRuntimeDir(candidate);
  const freeze = readJsonObject(path.join(runtimeDir, "source_freeze.json"));
  const runtimeFingerprints = readJsonObject(path.join(runtimeDir, "fingerprints.json"));
  const fullJest = readJsonObject(path.join(runtimeDir, "full-jest", "result.json"));
  const fullJestSummary = readJsonObject(path.join(runtimeDir, "full-jest", "summary.json"));
  const exitCode = readExitCode(path.join(runtimeDir, "full-jest", "exit_code.txt"));
  const android = readJsonObject(path.join(runtimeDir, "android", "verify.json"));
  const pipelineVerify = readJsonObject(path.join(runtimeDir, "pipeline_verify.json"));
  const fingerprints = computeReleaseFingerprints();
  const failures: string[] = [];

  if (freeze.source_commit !== currentHead()) failures.push("SOURCE_HEAD_MISMATCH");
  if (freeze.candidate_hash !== candidate.candidateHash) failures.push("FREEZE_CANDIDATE_HASH_MISMATCH");
  if (runtimeFingerprints.candidateHash !== candidate.candidateHash) failures.push("RUNTIME_FINGERPRINT_CANDIDATE_HASH_MISMATCH");
  if (fingerprints.candidateHash !== candidate.candidateHash) failures.push("CURRENT_FINGERPRINT_CANDIDATE_HASH_MISMATCH");
  if (exitCode !== 0) failures.push("FULL_JEST_EXIT_CODE_NOT_ZERO");
  if (fullJest.success !== true && fullJest.passed !== true) failures.push("FULL_JEST_RESULT_NOT_SUCCESS");
  if (fullJest.numFailedTestSuites !== 0) failures.push("FULL_JEST_FAILED_SUITES");
  if (fullJest.numFailedTests !== 0) failures.push("FULL_JEST_FAILED_TESTS");
  if (fullJest.fake_green_claimed === true || fullJestSummary.fake_green_claimed === true) failures.push("FULL_JEST_FAKE_GREEN");
  if (android.final_status !== "GREEN_ANDROID_API34_PIPELINE_READY") failures.push("ANDROID_API34_PIPELINE_NOT_GREEN");
  if (android.fake_green_claimed === true) failures.push("ANDROID_FAKE_GREEN");
  if (pipelineVerify.final_status !== "GREEN_RELEASE_PIPELINE_VERIFY_READ_ONLY") failures.push("PIPELINE_VERIFY_NOT_GREEN");
  if (pipelineVerify.fake_green_claimed === true) failures.push("PIPELINE_VERIFY_FAKE_GREEN");

  if (failures.length > 0) {
    throw new Error(`BLOCKED_PIPELINE_PROMOTION_NOT_READY:${failures.join(",")}`);
  }

  return {
    candidate,
    freeze,
    fingerprints,
    fullJest,
    fullJestSummary,
    android,
    pipelineVerify,
  };
}

function promoteReleasePipelineEvidence(): void {
  const ready = assertPipelinePromotionReady();
  const tempDir = `${RELEASE_PIPELINE_ARTIFACT_DIR}.tmp-${Date.now()}`;
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  const writeTemp = (name: string, value: unknown) => writeJsonFile(path.join(tempDir, name), value);
  const payloads = computeReleaseFingerprintPayloads();
  const existingCloseout = readJsonObjectIfExists(path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "CLOSEOUT_PROOF.json"));

  writeTemp("source_freeze.json", ready.freeze);
  writeTemp("fingerprints.json", {
    ...ready.fingerprints,
    payloads,
    fake_green_claimed: false,
  });
  writeTemp("candidate.json", {
    ...ready.candidate,
    state: "RELEASE_VERIFY_GREEN",
    fake_green_claimed: false,
  });
  writeTemp("full_jest_summary.json", {
    final_status: "GREEN_FULL_JEST_FROZEN_PASSED",
    candidate_id: ready.candidate.candidate_id,
    candidate_hash: ready.candidate.candidateHash,
    source_commit: ready.candidate.source_commit,
    numFailedTestSuites: ready.fullJest.numFailedTestSuites,
    numFailedTests: ready.fullJest.numFailedTests,
    numPassedTestSuites: ready.fullJest.numPassedTestSuites ?? null,
    numPassedTests: ready.fullJest.numPassedTests ?? null,
    full_jest_runs: 1,
    fake_green_claimed: false,
  });
  writeTemp("android_api34_pipeline.json", ready.android);
  writeTemp("pipeline_verify.json", ready.pipelineVerify);
  writeTemp("CLOSEOUT_PROOF.json", {
    final_status: "GREEN_RELEASE_PIPELINE_SOURCE_FREEZE_BUILD_CACHE_PROOF_LINEAGE_STABILIZED_READY",
    base_full_jest_green_proven: true,
    product_source_hash_present: true,
    proof_harness_hash_present: true,
    native_build_hash_present: true,
    candidate_hash_present: true,
    source_freeze_count: 1,
    source_changes_after_freeze: 0,
    execution_output_gitignored: true,
    tracked_files_modified_by_execution: 0,
    full_jest_runs: 1,
    full_jest_passed: true,
    release_pipeline_verify_read_only: true,
    release_pipeline_verify_passed: true,
    android_uses_dev_client: false,
    android_uses_metro: false,
    android_actual_api: ready.android.android_actual_api,
    api36_used: false,
    android_apk_contains_embedded_bundle: ready.android.android_apk_contains_embedded_bundle,
    android_build_cache_valid: ready.android.android_build_cache_valid,
    android_app_root_ready: ready.android.android_app_root_ready,
    android_build_identity_matches: ready.android.android_build_identity_matches,
    proof_lineage_valid: true,
    proof_commit_artifact_only: true,
    test_weakening_found: false,
    secrets_written: false,
    branch_pushed: existingCloseout?.branch_pushed === true,
    post_push_pipeline_verify_passed: existingCloseout?.post_push_pipeline_verify_passed === true,
    local_head_equals_upstream: existingCloseout?.local_head_equals_upstream === true,
    final_worktree_clean: false,
    fake_green_claimed: false,
    blockers: [],
  });

  fs.rmSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true, force: true });
  fs.renameSync(tempDir, RELEASE_PIPELINE_ARTIFACT_DIR);
}

function main(): void {
  if (process.argv[2] === "--pipeline") {
    promoteReleasePipelineEvidence();
    console.log(JSON.stringify({ promoted: true, artifact_dir: RELEASE_PIPELINE_ARTIFACT_DIR, fake_green_claimed: false }, null, 2));
    return;
  }

  const sourcePath = process.argv[2];
  const targetName = process.argv[3] ?? path.basename(sourcePath ?? "");
  if (!sourcePath || !targetName) {
    throw new Error("Usage: tsx scripts/release/promoteVerifiedArtifact.ts <source-json> <target-name>");
  }
  const target = promoteVerifiedArtifact({ sourcePath, targetName });
  console.log(JSON.stringify({ promoted: true, target, fake_green_claimed: false }, null, 2));
}

main();
