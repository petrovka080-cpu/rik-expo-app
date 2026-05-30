import { writeInternalCanaryReplayArtifacts } from "./aiEstimateInternalCanaryCore";

export function runAiEstimateInternalCanaryReplay() {
  const replay = writeInternalCanaryReplayArtifacts();
  if (replay.failures.length > 0) {
    throw new Error(`NO_GO_REPLAY_FAILED:${replay.failures.map((failure) => failure.classification).join(";")}`);
  }
  return replay;
}

if (require.main === module) {
  runAiEstimateInternalCanaryReplay();
}
