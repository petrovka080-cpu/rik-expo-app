import { createReleaseCandidate, writeReleaseCandidate } from "./releaseCandidateState";
import { writeReleaseFingerprintsArtifact } from "./computeReleaseFingerprints";

function parseState(): "DEVELOPING" | "SOURCE_FROZEN" {
  const stateArg = process.argv.find((value) => value.startsWith("--state="));
  const state = stateArg?.slice("--state=".length) ?? "DEVELOPING";
  if (state !== "DEVELOPING" && state !== "SOURCE_FROZEN") {
    throw new Error("createReleaseCandidate supports --state=DEVELOPING or --state=SOURCE_FROZEN");
  }
  return state;
}

function main(): void {
  writeReleaseFingerprintsArtifact();
  const candidate = writeReleaseCandidate(createReleaseCandidate(parseState()));
  console.log(JSON.stringify({
    candidate_id: candidate.candidate_id,
    state: candidate.state,
    source_tree_hash: candidate.sourceTreeHash,
    fake_green_claimed: false,
  }, null, 2));
}

main();
