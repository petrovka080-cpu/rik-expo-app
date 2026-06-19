import fs from "node:fs";
import path from "node:path";

import {
  RELEASE_PIPELINE_ARTIFACT_DIR,
  writeReleaseFingerprintsArtifact,
} from "./computeReleaseFingerprints";
import {
  createReleaseCandidate,
  listSourceWorktreeChanges,
  listStagedFiles,
  writeReleaseCandidate,
} from "./releaseCandidateState";

function main(): void {
  const staged = listStagedFiles();
  if (staged.length > 0) {
    throw new Error(`BLOCKED_SOURCE_FREEZE_STAGED_FILES:${staged.join(",")}`);
  }
  const sourceChanges = listSourceWorktreeChanges();
  if (sourceChanges.length > 0) {
    throw new Error(`BLOCKED_SOURCE_FREEZE_SOURCE_DIRTY:${sourceChanges.join(",")}`);
  }

  const fingerprints = writeReleaseFingerprintsArtifact();
  const candidate = writeReleaseCandidate({
    ...createReleaseCandidate("SOURCE_FROZEN"),
    ...fingerprints,
    source_changes_after_freeze: 0,
  });
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "source_freeze.json"),
    `${JSON.stringify({
      candidate_id: candidate.candidate_id,
      source_commit: candidate.source_commit,
      source_tree_hash: candidate.sourceTreeHash,
      source_changes_after_freeze: 0,
      source_candidate_frozen: true,
      source_amend_after_freeze: false,
      fake_green_claimed: false,
    }, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({
    final_status: "SOURCE_FROZEN",
    candidate_id: candidate.candidate_id,
    source_tree_hash: candidate.sourceTreeHash,
    fake_green_claimed: false,
  }, null, 2));
}

main();
