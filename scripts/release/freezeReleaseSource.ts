import path from "node:path";

import {
  releasePipelineRuntimeDir,
  computeReleaseFingerprintPayloads,
  computeReleaseFingerprints,
} from "./computeReleaseFingerprints";
import {
  createReleaseCandidate,
  listSourceWorktreeChanges,
  listStagedFiles,
  writeReleaseCandidate,
} from "./releaseCandidateState";
import { writeJsonFile } from "./releasePipelineRuntime";

function main(): void {
  const staged = listStagedFiles();
  if (staged.length > 0) {
    throw new Error(`BLOCKED_SOURCE_FREEZE_STAGED_FILES:${staged.join(",")}`);
  }
  const sourceChanges = listSourceWorktreeChanges();
  if (sourceChanges.length > 0) {
    throw new Error(`BLOCKED_SOURCE_FREEZE_SOURCE_DIRTY:${sourceChanges.join(",")}`);
  }

  const fingerprints = computeReleaseFingerprints();
  const candidate = writeReleaseCandidate({
    ...createReleaseCandidate("SOURCE_FROZEN"),
    ...fingerprints,
    source_changes_after_freeze: 0,
  });
  const runtimeDir = releasePipelineRuntimeDir(candidate.candidateHash);
  writeJsonFile(
    path.join(runtimeDir, "source_freeze.json"),
    {
      candidate_id: candidate.candidate_id,
      source_commit: candidate.source_commit,
      source_tree_hash: candidate.sourceTreeHash,
      product_source_hash: candidate.productSourceHash,
      proof_harness_hash: candidate.proofHarnessHash,
      native_build_hash: candidate.nativeBuildHash,
      candidate_hash: candidate.candidateHash,
      apk_build_key: candidate.apkBuildKey,
      source_changes_after_freeze: 0,
      source_candidate_frozen: true,
      source_amend_after_freeze: false,
      fake_green_claimed: false,
    },
  );
  writeJsonFile(
    path.join(runtimeDir, "fingerprints.json"),
    {
      ...fingerprints,
      payloads: computeReleaseFingerprintPayloads(),
      fake_green_claimed: false,
    },
  );
  console.log(JSON.stringify({
    final_status: "SOURCE_FROZEN",
    candidate_id: candidate.candidate_id,
    source_tree_hash: candidate.sourceTreeHash,
    candidate_hash: candidate.candidateHash,
    fake_green_claimed: false,
  }, null, 2));
}

main();
